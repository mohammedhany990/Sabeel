package com.sabeel.notification.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.notification.domain.Notification;
import com.sabeel.notification.domain.UserMirror;
import com.sabeel.notification.repository.UserMirrorRepository;
import com.sabeel.notification.service.NotificationService;
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
    private final UserMirrorRepository userMirrorRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC_USER_REGISTERED, groupId = "notification-service")
    public void onUserRegistered(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_USER_REGISTERED, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            notificationService.upsertUserMirror(userId, p.get("email").asText(), p.get("name").asText());
            String token = p.get("verificationToken").asText();
            notificationService.sendNow(userId, "EMAIL_VERIFICATION",
                    "Verify your Sabeel account",
                    "Assalamu alaikum " + p.get("name").asText()
                            + ",\n\nWelcome to Sabeel. Verify your email with this token:\n\n" + token
                            + "\n\nThe token expires in 24 hours.",
                    Notification.Channel.EMAIL);
        });
    }

    @KafkaListener(topics = TOPIC_PASSWORD_RESET, groupId = "notification-service")
    public void onPasswordReset(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_PASSWORD_RESET, () ->
                notificationService.sendNow(UUID.fromString(p.get("userId").asText()), "PASSWORD_RESET",
                        "Reset your Sabeel password",
                        "Use this token to reset your password (valid 30 minutes):\n\n" + p.get("resetToken").asText(),
                        Notification.Channel.EMAIL));
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
                        p.has("azkarReminders") ? p.get("azkarReminders").asBoolean() : true));
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
            notificationService.schedule(userId, "MEMORIZATION_TASK",
                    "Today's memorization is ready",
                    "Task for " + p.get("date").asText() + ": surah " + p.get("surahId").asInt()
                            + ", ayahs " + p.get("fromAyah").asInt() + "-" + p.get("toAyah").asInt() + ".",
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
            var mirror = userMirrorRepository.findById(userId);
            Instant scheduledFor = notificationService.reminderInstant(
                    p.get("date").asText(),
                    mirror.map(UserMirror::getRevisionReminderTime).orElse(null),
                    mirror.map(UserMirror::getTimezone).orElse(null));
            notificationService.schedule(userId, "REVISION_DUE",
                    "Revision is due",
                    "You have " + p.get("itemCount").asInt() + " memorized range(s) due for revision today.",
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
            notificationService.scheduleDeduped(userId, "PRAYER_REMINDER",
                    "Time for " + prayer,
                    "It's " + prayer + " time. May Allah accept your prayer.",
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
            String label = "EVENING".equals(category) ? "evening" : "morning";
            notificationService.scheduleDeduped(userId, "AZKAR_REMINDER",
                    "Your " + label + " azkar",
                    "Don't forget your " + label + " azkar today.",
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
        notificationService.processEvent(eventId, TOPIC_STREAK_MILESTONE, () ->
                notificationService.schedule(UUID.fromString(p.get("userId").asText()), "STREAK_MILESTONE",
                        "MashaAllah, " + p.get("streakDays").asInt() + " days in a row",
                        "You kept your " + p.get("categoryCode").asText().toLowerCase().replace('_', ' ')
                                + " azkar for " + p.get("streakDays").asInt() + " days straight. Keep going!",
                        Notification.Channel.PUSH, Instant.now()));
    }

    @KafkaListener(topics = {TOPIC_PLAN_COMPLETED, TOPIC_ITEM_MASTERED}, groupId = "notification-service")
    public void onAchievement(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, envelope.get("eventType").asText(), () ->
                notificationService.schedule(UUID.fromString(p.get("userId").asText()), "ACHIEVEMENT",
                        "MashaAllah, milestone reached",
                        "You completed a memorization milestone. Keep going!",
                        Notification.Channel.PUSH, Instant.now()));
    }

    @KafkaListener(topics = TOPIC_COURSE_PUBLISHED, groupId = "notification-service")
    public void onCoursePublished(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_COURSE_PUBLISHED, () ->
                notificationService.schedule(UUID.fromString(p.get("teacherId").asText()), "COURSE_PUBLISHED",
                        "Your course is live",
                        "\"" + p.get("title").asText() + "\" is now published and visible to students.",
                        Notification.Channel.PUSH, Instant.now()));
    }

    @KafkaListener(topics = TOPIC_ENROLLMENT_CREATED, groupId = "notification-service")
    public void onEnrollmentCreated(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_ENROLLMENT_CREATED, () ->
                notificationService.schedule(UUID.fromString(p.get("userId").asText()), "ENROLLMENT",
                        "Enrolled in a new course",
                        "You joined \"" + p.get("title").asText() + "\". Bismillah, happy learning!",
                        Notification.Channel.PUSH, Instant.now()));
    }

    @KafkaListener(topics = TOPIC_EVALUATION_COMPLETED, groupId = "notification-service")
    public void onEvaluationCompleted(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_EVALUATION_COMPLETED, () ->
                notificationService.schedule(UUID.fromString(p.get("userId").asText()), "RECITATION_RESULT",
                        "Recitation evaluation ready",
                        "Your recitation scored " + p.get("accuracy").asDouble() + "% accuracy with "
                                + p.get("mistakeCount").asInt() + " mistake(s). Tap to review the details.",
                        Notification.Channel.PUSH, Instant.now()));
    }

    @KafkaListener(topics = TOPIC_BADGE_AWARDED, groupId = "notification-service")
    public void onBadgeAwarded(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        notificationService.processEvent(eventId, TOPIC_BADGE_AWARDED, () ->
                notificationService.schedule(UUID.fromString(p.get("userId").asText()), "BADGE_AWARDED",
                        "New badge: " + p.get("title").asText(),
                        "MashaAllah, you earned the \"" + p.get("title").asText() + "\" badge.",
                        Notification.Channel.PUSH, Instant.now()));
    }
}
