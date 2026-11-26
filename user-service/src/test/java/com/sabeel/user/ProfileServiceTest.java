package com.sabeel.user;

import com.sabeel.user.domain.NotificationPreference;
import com.sabeel.user.domain.Profile;
import com.sabeel.user.dto.PreferencesRequest;
import com.sabeel.user.dto.ProfileResponse;
import com.sabeel.user.dto.UpdateProfileRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import com.sabeel.user.event.OutboxService;
import com.sabeel.user.repository.DeviceTokenRepository;
import com.sabeel.user.repository.NotificationPreferenceRepository;
import com.sabeel.user.repository.ProfileRepository;
import com.sabeel.user.service.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProfileServiceTest {
    private NotificationPreferenceRepository preferenceRepository;
    private OutboxService outboxService;
    private ProfileRepository profileRepository;
    private ProfileService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        profileRepository = mock(ProfileRepository.class);
        preferenceRepository = mock(NotificationPreferenceRepository.class);
        outboxService = mock(OutboxService.class);
        service = new ProfileService(profileRepository, preferenceRepository,
                mock(DeviceTokenRepository.class), outboxService);
        Profile profile = Profile.builder().userId(userId).name("A").timezone("Africa/Cairo").build();
        when(profileRepository.findById(userId)).thenReturn(Optional.of(profile));
    }

    @Test
    void preferencesEventCarriesPrayerAndAzkarToggles() {
        NotificationPreference prefs = NotificationPreference.builder().userId(userId)
                .pushEnabled(true).emailEnabled(true).prayerReminders(true).azkarReminders(true).build();
        when(preferenceRepository.findById(userId)).thenReturn(Optional.of(prefs));
        when(preferenceRepository.save(any(NotificationPreference.class))).thenAnswer(inv -> inv.getArgument(0));
        service.updatePreferences(userId, new PreferencesRequest(null, null, null, null, false, false, null));
        verify(outboxService).record(eq("user.preferences.updated"), eq(userId.toString()), argThat(p -> {
            Map<?, ?> map = (Map<?, ?>) p;
            return Boolean.FALSE.equals(map.get("prayerReminders")) && Boolean.FALSE.equals(map.get("azkarReminders"));
        }));
    }

    @Test
    void enabledTogglesArePublishedAsTrue() {
        NotificationPreference prefs = NotificationPreference.builder().userId(userId)
                .pushEnabled(true).emailEnabled(true).prayerReminders(true).azkarReminders(true).build();
        when(preferenceRepository.findById(userId)).thenReturn(Optional.of(prefs));
        when(preferenceRepository.save(any(NotificationPreference.class))).thenAnswer(inv -> inv.getArgument(0));
        service.updatePreferences(userId, new PreferencesRequest(null, null, null, null, null, null, null));
        verify(outboxService).record(eq("user.preferences.updated"), eq(userId.toString()), argThat(p -> {
            Map<?, ?> map = (Map<?, ?>) p;
            return Boolean.TRUE.equals(map.get("prayerReminders")) && Boolean.TRUE.equals(map.get("azkarReminders"));
        }));
    }

    @Test
    void revisionReminderToggleIsPublished() {
        NotificationPreference prefs = NotificationPreference.builder().userId(userId)
                .pushEnabled(true).emailEnabled(true).prayerReminders(true).azkarReminders(true)
                .revisionReminders(true).build();
        when(preferenceRepository.findById(userId)).thenReturn(Optional.of(prefs));
        when(preferenceRepository.save(any(NotificationPreference.class))).thenAnswer(inv -> inv.getArgument(0));
        service.updatePreferences(userId, new PreferencesRequest(null, null, null, null, null, null, false));
        verify(outboxService).record(eq("user.preferences.updated"), eq(userId.toString()), argThat(p -> {
            Map<?, ?> map = (Map<?, ?>) p;
            return Boolean.FALSE.equals(map.get("revisionReminders")) && Boolean.TRUE.equals(map.get("prayerReminders"));
        }));
    }

    private NotificationPreference defaultPrefs() {
        NotificationPreference prefs = NotificationPreference.builder().userId(userId)
                .pushEnabled(true).emailEnabled(true).prayerReminders(true).azkarReminders(true).build();
        when(preferenceRepository.findById(userId)).thenReturn(Optional.of(prefs));
        when(profileRepository.save(any(Profile.class))).thenAnswer(inv -> inv.getArgument(0));
        return prefs;
    }

    @Test
    void missingLanguageDefaultsToEnglishInResponse() {
        ProfileResponse response = service.get(userId);
        org.junit.jupiter.api.Assertions.assertEquals("en", response.preferredLanguage());
    }

    @Test
    void changingLanguageStoresItAndPublishesItToNotifications() {
        defaultPrefs();
        ProfileResponse response = service.update(userId, new UpdateProfileRequest(null, null, null, null, null, "ar"));
        org.junit.jupiter.api.Assertions.assertEquals("ar", response.preferredLanguage());
        verify(outboxService).record(eq("user.preferences.updated"), eq(userId.toString()), argThat(p ->
                "ar".equals(((Map<?, ?>) p).get("language"))));
    }

    @Test
    void updateWithoutLanguageChangeDoesNotPublishPreferences() {
        defaultPrefs();
        service.update(userId, new UpdateProfileRequest("New Name", null, null, null, null, null));
        verify(outboxService, never()).record(eq("user.preferences.updated"), any(), any());
    }

    @Test
    void timezoneChangeIsPublishedWithCurrentLanguage() {
        defaultPrefs();
        service.update(userId, new UpdateProfileRequest(null, null, null, "Asia/Riyadh", null, null));
        verify(outboxService).record(eq("user.preferences.updated"), eq(userId.toString()), argThat(p -> {
            Map<?, ?> map = (Map<?, ?>) p;
            return "Asia/Riyadh".equals(map.get("timezone")) && "en".equals(map.get("language"));
        }));
    }

    @Test
    void registrationEventLanguageSeedsTheProfile() {
        UUID fresh = UUID.randomUUID();
        when(profileRepository.findById(fresh)).thenReturn(Optional.empty());
        when(profileRepository.save(any(Profile.class))).thenAnswer(inv -> inv.getArgument(0));
        when(preferenceRepository.findById(fresh)).thenReturn(Optional.empty());
        when(preferenceRepository.save(any(NotificationPreference.class))).thenAnswer(inv -> inv.getArgument(0));
        service.createFromRegistration(fresh, "Omar", "ar-EG");
        org.mockito.ArgumentCaptor<Profile> captor = org.mockito.ArgumentCaptor.forClass(Profile.class);
        verify(profileRepository).save(captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals("ar", captor.getValue().getPreferredLanguage());
    }

    @Test
    void unsupportedLanguageIsRejectedByValidation() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        org.junit.jupiter.api.Assertions.assertFalse(validator.validate(
                new UpdateProfileRequest(null, null, null, null, null, "fr")).isEmpty());
        org.junit.jupiter.api.Assertions.assertTrue(validator.validate(
                new UpdateProfileRequest(null, null, null, null, null, "ar")).isEmpty());
        org.junit.jupiter.api.Assertions.assertTrue(validator.validate(
                new UpdateProfileRequest(null, null, null, null, null, null)).isEmpty());
    }

    @Test
    void validationMessagesAreLocalisedWhenArabicIsRequested() {
        java.util.Locale previous = java.util.Locale.getDefault();
        java.util.Locale.setDefault(java.util.Locale.forLanguageTag("ar"));
        try {
            var factory = Validation.buildDefaultValidatorFactory();
            var violations = factory.getValidator().validate(new UpdateProfileRequest("x", null, null, null, null, null));
            org.junit.jupiter.api.Assertions.assertFalse(violations.isEmpty());
            String message = violations.iterator().next().getMessage();
            org.junit.jupiter.api.Assertions.assertTrue(message.chars().anyMatch(c -> c >= 0x0600 && c <= 0x06FF), message);
        } finally {
            java.util.Locale.setDefault(previous);
        }
    }
}
