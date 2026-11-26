package com.sabeel.notification.service;

import com.sabeel.notification.domain.*;
import com.sabeel.notification.dto.NotificationResponse;
import com.sabeel.notification.exception.ApiException;
import com.sabeel.notification.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final UserMirrorRepository userMirrorRepository;
    private final DeviceTokenMirrorRepository deviceTokenMirrorRepository;
    private final EmailSender emailSender;
    private final PushSender pushSender;

    @Transactional
    public boolean processEvent(String eventId, String topic, Runnable work) {
        if (processedEventRepository.existsById(eventId)) {
            log.info("duplicate event {} on {} skipped", eventId, topic);
            return false;
        }
        work.run();
        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(eventId).topic(topic).processedAt(Instant.now()).build());
        return true;
    }

    @Transactional
    public void schedule(UUID userId, String type, String title, String body,
                         Notification.Channel channel, Instant scheduledFor) {
        notificationRepository.save(Notification.builder()
                .userId(userId).type(type).title(title).body(body)
                .channel(channel).status(Notification.Status.PENDING)
                .scheduledFor(scheduledFor).createdAt(Instant.now())
                .language(languageOf(userId))
                .build());
    }

    @Transactional
    public void sendNow(UUID userId, String type, String title, String body, Notification.Channel channel) {
        Notification notification = notificationRepository.save(Notification.builder()
                .userId(userId).type(type).title(title).body(body)
                .channel(channel).status(Notification.Status.PENDING)
                .scheduledFor(Instant.now()).createdAt(Instant.now())
                .language(languageOf(userId))
                .build());
        deliver(notification);
    }

    public Instant reminderInstant(String date, LocalTime reminderTime, String timezone) {
        if (reminderTime == null) {
            return Instant.now();
        }
        ZoneId zone;
        try {
            zone = ZoneId.of(timezone == null || timezone.isBlank() ? "UTC" : timezone);
        } catch (Exception e) {
            zone = ZoneId.of("UTC");
        }
        return ZonedDateTime.of(LocalDate.parse(date), reminderTime, zone).toInstant();
    }

    @Scheduled(fixedDelayString = "${notification.dispatcher-delay-ms:30000}")
    @Transactional
    public void dispatchDue() {
        for (Notification n : notificationRepository.findTop100ByStatusAndScheduledForLessThanEqualOrderByScheduledFor(
                Notification.Status.PENDING, Instant.now())) {
            deliver(n);
        }
    }

    public void deliver(Notification n) {
        var mirror = userMirrorRepository.findById(n.getUserId());
        boolean pushAllowed = mirror.map(UserMirror::isPushEnabled).orElse(true);
        boolean emailAllowed = mirror.map(UserMirror::isEmailEnabled).orElse(true);
        try {
            if ((n.getChannel() == Notification.Channel.EMAIL || n.getChannel() == Notification.Channel.BOTH) && emailAllowed) {
                mirror.ifPresent(u -> emailSender.send(u.getEmail(), n.getTitle(), n.getBody()));
            }
            if ((n.getChannel() == Notification.Channel.PUSH || n.getChannel() == Notification.Channel.BOTH) && pushAllowed) {
                List<String> tokens = deviceTokenMirrorRepository.findByUserId(n.getUserId()).stream()
                        .map(DeviceTokenMirror::getFcmToken).toList();
                pushSender.send(tokens, n.getTitle(), n.getBody());
            }
            n.setStatus(Notification.Status.SENT);
            n.setSentAt(Instant.now());
        } catch (Exception e) {
            log.error("delivery failed for notification {}: {}", n.getId(), e.getMessage());
            n.setStatus(Notification.Status.FAILED);
            n.setError(e.getMessage());
        }
        notificationRepository.save(n);
    }

    @Transactional(readOnly = true)
    public String languageOf(UUID userId) {
        return userMirrorRepository.findById(userId)
                .map(m -> NotificationTemplates.normalize(m.getLanguage()))
                .orElse(NotificationTemplates.EN);
    }

    @Transactional
    public void upsertUserMirror(UUID userId, String email, String name) {
        upsertUserMirror(userId, email, name, null);
    }

    @Transactional
    public void upsertUserMirror(UUID userId, String email, String name, String language) {
        UserMirror mirror = userMirrorRepository.findById(userId).orElse(UserMirror.builder()
                .userId(userId).pushEnabled(true).emailEnabled(true)
                .prayerRemindersEnabled(true).azkarRemindersEnabled(true)
                .timezone("Africa/Cairo").build());
        mirror.setEmail(email);
        mirror.setName(name);
        if (language != null || mirror.getLanguage() == null) {
            mirror.setLanguage(NotificationTemplates.normalize(language));
        }
        userMirrorRepository.save(mirror);
    }

    @Transactional
    public void applyPreferences(UUID userId, boolean pushEnabled, boolean emailEnabled,
                                 String memorizationReminderTime, String revisionReminderTime, String timezone,
                                 boolean prayerRemindersEnabled, boolean azkarRemindersEnabled) {
        applyPreferences(userId, pushEnabled, emailEnabled, memorizationReminderTime, revisionReminderTime,
                timezone, prayerRemindersEnabled, azkarRemindersEnabled, null);
    }

    @Transactional
    public void applyPreferences(UUID userId, boolean pushEnabled, boolean emailEnabled,
                                 String memorizationReminderTime, String revisionReminderTime, String timezone,
                                 boolean prayerRemindersEnabled, boolean azkarRemindersEnabled, String language) {
        UserMirror mirror = userMirrorRepository.findById(userId).orElse(UserMirror.builder()
                .userId(userId).email("").name("")
                .prayerRemindersEnabled(true).azkarRemindersEnabled(true).build());
        mirror.setPushEnabled(pushEnabled);
        mirror.setEmailEnabled(emailEnabled);
        mirror.setMemorizationReminderTime(parseTime(memorizationReminderTime));
        mirror.setRevisionReminderTime(parseTime(revisionReminderTime));
        mirror.setTimezone(timezone == null || timezone.isBlank() ? "Africa/Cairo" : timezone);
        mirror.setPrayerRemindersEnabled(prayerRemindersEnabled);
        mirror.setAzkarRemindersEnabled(azkarRemindersEnabled);
        if (language != null || mirror.getLanguage() == null) {
            mirror.setLanguage(NotificationTemplates.normalize(language));
        }
        userMirrorRepository.save(mirror);
        if (!prayerRemindersEnabled) {
            cancelPending(userId, "PRAYER_REMINDER");
        }
        if (!azkarRemindersEnabled) {
            cancelPending(userId, "AZKAR_REMINDER");
        }
    }

    @Transactional
    public void scheduleDeduped(UUID userId, String type, String title, String body,
                                Notification.Channel channel, Instant scheduledFor) {
        for (Notification n : notificationRepository.findByUserIdAndTypeAndStatus(
                userId, type, Notification.Status.PENDING)) {
            if (scheduledFor.equals(n.getScheduledFor())) {
                n.setStatus(Notification.Status.CANCELLED);
                notificationRepository.save(n);
            }
        }
        schedule(userId, type, title, body, channel, scheduledFor);
    }

    @Transactional
    public int cancelPending(UUID userId, String type) {
        List<Notification> pending = notificationRepository.findByUserIdAndTypeAndStatus(
                userId, type, Notification.Status.PENDING);
        for (Notification n : pending) {
            n.setStatus(Notification.Status.CANCELLED);
            notificationRepository.save(n);
        }
        return pending.size();
    }

    @Transactional(readOnly = true)
    public boolean prayerRemindersEnabled(UUID userId) {
        return userMirrorRepository.findById(userId).map(UserMirror::isPrayerRemindersEnabled).orElse(true);
    }

    @Transactional(readOnly = true)
    public boolean azkarRemindersEnabled(UUID userId) {
        return userMirrorRepository.findById(userId).map(UserMirror::isAzkarRemindersEnabled).orElse(true);
    }

    private LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return LocalTime.parse(value);
    }

    @Transactional
    public void upsertDeviceToken(UUID userId, String fcmToken, String platform) {
        deviceTokenMirrorRepository.save(DeviceTokenMirror.builder()
                .fcmToken(fcmToken).userId(userId).platform(platform).lastSeenAt(Instant.now()).build());
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> myNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(n -> new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getBody(),
                        n.getChannel().name(), n.getStatus().name(), n.getCreatedAt(), n.getReadAt(),
                        n.getLanguage() == null ? NotificationTemplates.EN : n.getLanguage()))
                .toList();
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        Notification n = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> ApiException.notFound("notification not found"));
        n.setReadAt(Instant.now());
        notificationRepository.save(n);
    }
}
