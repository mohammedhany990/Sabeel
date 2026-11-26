package com.sabeel.user.service;

import com.sabeel.user.domain.DeviceToken;
import com.sabeel.user.domain.NotificationPreference;
import com.sabeel.user.domain.Profile;
import com.sabeel.user.dto.*;
import com.sabeel.user.event.OutboxService;
import com.sabeel.user.exception.ApiException;
import com.sabeel.user.repository.DeviceTokenRepository;
import com.sabeel.user.repository.NotificationPreferenceRepository;
import com.sabeel.user.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.sabeel.user.config.KafkaConfig.TOPIC_DEVICE_TOKEN;
import static com.sabeel.user.config.KafkaConfig.TOPIC_PREFERENCES_UPDATED;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final ProfileRepository profileRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final DeviceTokenRepository deviceTokenRepository;
    private final OutboxService outboxService;

    @Transactional
    public void createFromRegistration(UUID userId, String name) {
        createFromRegistration(userId, name, null);
    }

    @Transactional
    public void createFromRegistration(UUID userId, String name, String language) {
        profileRepository.findById(userId).orElseGet(() -> profileRepository.save(Profile.builder()
                .userId(userId)
                .name(name)
                .timezone("Africa/Cairo")
                .preferredLanguage(normalizeLanguage(language))
                .build()));
        NotificationPreference prefs = preferenceRepository.findById(userId).orElseGet(() -> preferenceRepository.save(NotificationPreference.builder()
                .userId(userId)
                .pushEnabled(true)
                .emailEnabled(true)
                .prayerReminders(true)
                .azkarReminders(true)
                .build()));
        publishPreferences(prefs, profileRepository.findById(userId).orElse(null));
    }

    @Transactional(readOnly = true)
    public ProfileResponse get(UUID userId) {
        return toResponse(profileRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("profile not found")));
    }

    @Transactional
    public ProfileResponse update(UUID userId, UpdateProfileRequest request) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("profile not found"));
        if (request.name() != null) profile.setName(request.name());
        if (request.profileImageUrl() != null) profile.setProfileImageUrl(request.profileImageUrl());
        if (request.country() != null) profile.setCountry(request.country());
        boolean reminderContextChanged = false;
        if (request.timezone() != null && !request.timezone().equals(profile.getTimezone())) {
            profile.setTimezone(request.timezone());
            reminderContextChanged = true;
        }
        if (request.preferredReciterId() != null) profile.setPreferredReciterId(request.preferredReciterId());
        if (request.preferredLanguage() != null
                && !normalizeLanguage(request.preferredLanguage()).equals(normalizeLanguage(profile.getPreferredLanguage()))) {
            profile.setPreferredLanguage(normalizeLanguage(request.preferredLanguage()));
            reminderContextChanged = true;
        }
        Profile saved = profileRepository.save(profile);
        if (reminderContextChanged) {
            preferenceRepository.findById(userId).ifPresent(prefs -> publishPreferences(prefs, saved));
        }
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PreferencesResponse getPreferences(UUID userId) {
        return toPreferencesResponse(preferenceRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("preferences not found")));
    }

    @Transactional
    public PreferencesResponse updatePreferences(UUID userId, PreferencesRequest request) {
        NotificationPreference prefs = preferenceRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("preferences not found"));
        if (request.pushEnabled() != null) prefs.setPushEnabled(request.pushEnabled());
        if (request.emailEnabled() != null) prefs.setEmailEnabled(request.emailEnabled());
        if (request.memorizationReminderTime() != null) prefs.setMemorizationReminderTime(request.memorizationReminderTime());
        if (request.revisionReminderTime() != null) prefs.setRevisionReminderTime(request.revisionReminderTime());
        if (request.prayerReminders() != null) prefs.setPrayerReminders(request.prayerReminders());
        if (request.azkarReminders() != null) prefs.setAzkarReminders(request.azkarReminders());
        NotificationPreference saved = preferenceRepository.save(prefs);
        publishPreferences(saved, profileRepository.findById(userId).orElse(null));
        return toPreferencesResponse(saved);
    }

    static String normalizeLanguage(String language) {
        return language != null && language.toLowerCase().startsWith("ar") ? "ar" : "en";
    }

    private void publishPreferences(NotificationPreference prefs, Profile profile) {
        String timezone = profile == null ? "Africa/Cairo" : profile.getTimezone();
        String language = profile == null ? "en" : normalizeLanguage(profile.getPreferredLanguage());
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("userId", prefs.getUserId().toString());
        payload.put("pushEnabled", prefs.isPushEnabled());
        payload.put("emailEnabled", prefs.isEmailEnabled());
        payload.put("memorizationReminderTime", prefs.getMemorizationReminderTime() == null ? "" : prefs.getMemorizationReminderTime().toString());
        payload.put("revisionReminderTime", prefs.getRevisionReminderTime() == null ? "" : prefs.getRevisionReminderTime().toString());
        payload.put("timezone", timezone);
        payload.put("language", language);
        payload.put("prayerReminders", prefs.isPrayerReminders());
        payload.put("azkarReminders", prefs.isAzkarReminders());
        outboxService.record(TOPIC_PREFERENCES_UPDATED, prefs.getUserId().toString(), payload);
    }

    @Transactional
    public void registerDeviceToken(UUID userId, DeviceTokenRequest request) {
        DeviceToken token = deviceTokenRepository.findByFcmToken(request.fcmToken())
                .orElse(DeviceToken.builder().fcmToken(request.fcmToken()).build());
        token.setUserId(userId);
        token.setPlatform(request.platform());
        token.setLastSeenAt(Instant.now());
        deviceTokenRepository.save(token);
        outboxService.record(TOPIC_DEVICE_TOKEN, userId.toString(),
                Map.of("userId", userId.toString(), "fcmToken", request.fcmToken(), "platform", request.platform()));
    }

    @Transactional
    public void removeDeviceToken(UUID userId, UUID tokenId) {
        DeviceToken token = deviceTokenRepository.findById(tokenId)
                .orElseThrow(() -> ApiException.notFound("device token not found"));
        if (!token.getUserId().equals(userId)) {
            throw ApiException.notFound("device token not found");
        }
        deviceTokenRepository.delete(token);
    }

    @Transactional(readOnly = true)
    public List<String> deviceTokensOf(UUID userId) {
        return deviceTokenRepository.findByUserId(userId).stream().map(DeviceToken::getFcmToken).toList();
    }

    private ProfileResponse toResponse(Profile p) {
        return new ProfileResponse(p.getUserId(), p.getName(), p.getProfileImageUrl(), p.getCountry(),
                p.getTimezone(), p.getPreferredReciterId(), p.getCreatedAt(), p.getUpdatedAt(),
                normalizeLanguage(p.getPreferredLanguage()));
    }

    private PreferencesResponse toPreferencesResponse(NotificationPreference p) {
        return new PreferencesResponse(p.isPushEnabled(), p.isEmailEnabled(), p.getMemorizationReminderTime(),
                p.getRevisionReminderTime(), p.isPrayerReminders(), p.isAzkarReminders());
    }
}
