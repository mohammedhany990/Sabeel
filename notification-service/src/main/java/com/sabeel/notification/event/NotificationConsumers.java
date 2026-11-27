package com.sabeel.notification.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.notification.domain.Notification;
import com.sabeel.notification.domain.UserMirror;
import com.sabeel.notification.repository.UserMirrorRepository;
import com.sabeel.notification.service.NotificationService;
import com.sabeel.notification.service.NotificationTemplates;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

import static com.sabeel.notification.config.KafkaConfig.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumers {
    private final NotificationService notificationService;
    private final NotificationTemplates templates;
    private final UserMirrorRepository userMirrorRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC_USER_REGISTERED, groupId = "notification-service")
    public void onUserRegistered(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_USER_REGISTERED, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            String language = p.has("language") ? p.get("language").asText() : null;
            notificationService.upsertUserMirror(userId, p.get("email").asText(), p.get("name").asText(), language);
            var content = templates.emailVerification(notificationService.languageOf(userId),
                    p.get("name").asText(), p.get("verificationToken").asText());
            notificationService.sendNow(userId, "EMAIL_VERIFICATION", content.title(), content.body(), content.html(),
                    Notification.Channel.EMAIL);
        });
    }

    @KafkaListener(topics = TOPIC_PASSWORD_RESET, groupId = "notification-service")
    public void onPasswordReset(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_PASSWORD_RESET, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            var content = templates.passwordReset(notificationService.languageOf(userId), p.get("resetToken").asText());
            notificationService.sendNow(userId, "PASSWORD_RESET", content.title(), content.body(), content.html(),
                    Notification.Channel.EMAIL);
        });
    }

    @KafkaListener(topics = TOPIC_DEVICE_TOKEN, groupId = "notification-service")
    public void onDeviceToken(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_DEVICE_TOKEN, () ->
                notificationService.upsertDeviceToken(UUID.fromString(p.get("userId").asText()),
                        p.get("fcmToken").asText(), p.get("platform").asText()));
    }

    @KafkaListener(topics = TOPIC_PREFERENCES_UPDATED, groupId = "notification-service")
    public void onPreferencesUpdated(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_PREFERENCES_UPDATED, () ->
                notificationService.applyPreferences(
                        UUID.fromString(p.get("userId").asText()),
                        p.get("pushEnabled").asBoolean(),
                        p.get("emailEnabled").asBoolean(),
                        p.get("memorizationReminderTime").asText(""),
                        p.get("revisionReminderTime").asText(""),
                        p.get("timezone").asText(""),
                        p.has("prayerReminders") ? p.get("prayerReminders").asBoolean() : true,
                        p.has("azkarReminders") ? p.get("azkarReminders").asBoolean() : true,
                        p.has("language") ? p.get("language").asText() : null,
                        p.has("revisionReminders") ? p.get("revisionReminders").asBoolean() : true));
    }

    @KafkaListener(topics = TOPIC_TASK_CREATED, groupId = "notification-service")
    public void onTaskCreated(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_TASK_CREATED, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            var mirror = userMirrorRepository.findById(userId);
            Instant scheduledFor = notificationService.reminderInstant(
                    p.get("date").asText(),
                    mirror.map(UserMirror::getMemorizationReminderTime).orElse(null),
                    mirror.map(UserMirror::getTimezone).orElse(null));
            var content = templates.memorizationTask(notificationService.languageOf(userId), p.get("date").asText(),
                    p.get("surahId").asInt(), p.get("fromAyah").asInt(), p.get("toAyah").asInt());
            notificationService.schedule(userId, "MEMORIZATION_TASK", content.title(), content.body(),
                    Notification.Channel.PUSH, scheduledFor);
        });
    }

    @KafkaListener(topics = TOPIC_REVISION_DUE, groupId = "notification-service")
    public void onRevisionDue(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_REVISION_DUE, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            if (!notificationService.revisionRemindersEnabled(userId)) {
                return;
            }
            var mirror = userMirrorRepository.findById(userId);
            Instant scheduledFor = notificationService.reminderInstant(
                    p.get("date").asText(),
                    mirror.map(UserMirror::getRevisionReminderTime).orElse(null),
                    mirror.map(UserMirror::getTimezone).orElse(null));
            var content = templates.revisionDue(notificationService.languageOf(userId), p.get("itemCount").asInt());
            notificationService.schedule(userId, "REVISION_DUE", content.title(), content.body(),
                    Notification.Channel.PUSH, scheduledFor);
        });
    }

    @KafkaListener(topics = TOPIC_PRAYER_REMINDER, groupId = "notification-service")
    public void onPrayerReminder(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_PRAYER_REMINDER, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            if (!notificationService.prayerRemindersEnabled(userId)) {
                return;
            }
            String prayer = p.get("prayer").asText();
            Instant at = Instant.parse(p.get("time").asText());
            var content = templates.prayerReminder(notificationService.languageOf(userId), prayer);
            notificationService.scheduleDeduped(userId, "PRAYER_REMINDER", content.title(), content.body(),
                    Notification.Channel.PUSH, at);
        });
    }

    @KafkaListener(topics = TOPIC_AZKAR_REMINDER, groupId = "notification-service")
    public void onAzkarReminder(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_AZKAR_REMINDER, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            if (!notificationService.azkarRemindersEnabled(userId)) {
                return;
            }
            String category = p.get("categoryCode").asText();
            var mirror = userMirrorRepository.findById(userId);
            String timezone = mirror.map(UserMirror::getTimezone).orElse(null);
            java.time.LocalTime defaultTime = "EVENING".equals(category)
                    ? java.time.LocalTime.of(17, 0) : java.time.LocalTime.of(6, 0);
            Instant scheduledFor = notificationService.reminderInstant(p.get("date").asText(), defaultTime, timezone);
            var content = templates.azkarReminder(notificationService.languageOf(userId), category);
            notificationService.scheduleDeduped(userId, "AZKAR_REMINDER", content.title(), content.body(),
                    Notification.Channel.PUSH, scheduledFor);
        });
    }

    @KafkaListener(topics = TOPIC_PRAYER_SETTINGS_UPDATED, groupId = "notification-service")
    public void onPrayerSettingsUpdated(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_PRAYER_SETTINGS_UPDATED, () ->
                notificationService.cancelPending(UUID.fromString(p.get("userId").asText()), "PRAYER_REMINDER"));
    }

    @KafkaListener(topics = TOPIC_STREAK_MILESTONE, groupId = "notification-service")
    public void onStreakMilestone(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_STREAK_MILESTONE, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            var content = templates.streakMilestone(notificationService.languageOf(userId),
                    p.get("streakDays").asInt(), p.get("categoryCode").asText());
            notificationService.schedule(userId, "STREAK_MILESTONE", content.title(), content.body(),
                    Notification.Channel.PUSH, Instant.now());
        });
    }

    @KafkaListener(topics = {TOPIC_PLAN_COMPLETED, TOPIC_ITEM_MASTERED}, groupId = "notification-service")
    public void onAchievement(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, envelope.get("eventType").asText(), () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            var content = templates.achievement(notificationService.languageOf(userId));
            notificationService.schedule(userId, "ACHIEVEMENT", content.title(), content.body(),
                    Notification.Channel.PUSH, Instant.now());
        });
    }

    @KafkaListener(topics = TOPIC_COURSE_PUBLISHED, groupId = "notification-service")
    public void onCoursePublished(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_COURSE_PUBLISHED, () -> {
            UUID teacherId = UUID.fromString(p.get("teacherId").asText());
            var content = templates.coursePublished(notificationService.languageOf(teacherId), p.get("title").asText());
            notificationService.schedule(teacherId, "COURSE_PUBLISHED", content.title(), content.body(),
                    Notification.Channel.PUSH, Instant.now());
        });
    }

    @KafkaListener(topics = TOPIC_ENROLLMENT_CREATED, groupId = "notification-service")
    public void onEnrollmentCreated(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_ENROLLMENT_CREATED, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            var content = templates.enrollment(notificationService.languageOf(userId), p.get("title").asText());
            notificationService.schedule(userId, "ENROLLMENT", content.title(), content.body(),
                    Notification.Channel.PUSH, Instant.now());
        });
    }

    @KafkaListener(topics = TOPIC_EVALUATION_COMPLETED, groupId = "notification-service")
    public void onEvaluationCompleted(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_EVALUATION_COMPLETED, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            var content = templates.recitationResult(notificationService.languageOf(userId),
                    p.get("accuracy").asDouble(), p.get("mistakeCount").asInt());
            notificationService.schedule(userId, "RECITATION_RESULT", content.title(), content.body(),
                    Notification.Channel.PUSH, Instant.now());
        });
    }

    @KafkaListener(topics = TOPIC_BADGE_AWARDED, groupId = "notification-service")
    public void onBadgeAwarded(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_BADGE_AWARDED, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            var content = templates.badgeAwarded(notificationService.languageOf(userId), p.get("title").asText(),
                    p.has("titleAr") ? p.get("titleAr").asText() : null);
            notificationService.schedule(userId, "BADGE_AWARDED", content.title(), content.body(),
                    Notification.Channel.PUSH, Instant.now());
        });
    }
}
