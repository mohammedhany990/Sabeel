package com.sabeel.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.notification.domain.Notification;
import com.sabeel.notification.domain.UserMirror;
import com.sabeel.notification.event.NotificationConsumers;
import com.sabeel.notification.repository.DeviceTokenMirrorRepository;
import com.sabeel.notification.repository.NotificationRepository;
import com.sabeel.notification.repository.ProcessedEventRepository;
import com.sabeel.notification.repository.UserMirrorRepository;
import com.sabeel.notification.service.EmailSender;
import com.sabeel.notification.service.NotificationService;
import com.sabeel.notification.service.NotificationTemplates;
import com.sabeel.notification.service.PushSender;
import com.sabeel.notification.service.SurahNames;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LocalizedNotificationTest {
    private final UUID userId = UUID.randomUUID();
    private NotificationRepository notificationRepository;
    private UserMirrorRepository userMirrorRepository;
    private EmailSender emailSender;
    private NotificationConsumers consumers;
    private final NotificationTemplates templates = new NotificationTemplates();

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));
        userMirrorRepository = mock(UserMirrorRepository.class);
        when(userMirrorRepository.save(any(UserMirror.class))).thenAnswer(inv -> inv.getArgument(0));
        emailSender = mock(EmailSender.class);
        NotificationService service = new NotificationService(notificationRepository,
                mock(ProcessedEventRepository.class), userMirrorRepository,
                mock(DeviceTokenMirrorRepository.class), emailSender, mock(PushSender.class));
        consumers = new NotificationConsumers(service, templates, userMirrorRepository, new ObjectMapper());
    }

    private void mirrorWithLanguage(String language) {
        UserMirror mirror = UserMirror.builder().userId(userId).email("a@b.c").name("Omar").pushEnabled(true)
                .emailEnabled(true).prayerRemindersEnabled(true).azkarRemindersEnabled(true)
                .timezone("Africa/Cairo").language(language).build();
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.of(mirror));
    }

    private String event(String payload) {
        return "{\"eventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"t\",\"payload\":" + payload + "}";
    }

    private Notification lastSaved() {
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, atLeastOnce()).save(captor.capture());
        return captor.getAllValues().get(captor.getAllValues().size() - 1);
    }

    @Test
    void arabicUserGetsArabicPrayerReminder() throws Exception {
        mirrorWithLanguage("ar");
        consumers.onPrayerReminder(event("{\"userId\":\"" + userId + "\",\"prayer\":\"maghrib\",\"time\":\"2026-11-26T15:00:00Z\"}"));
        Notification n = lastSaved();
        assertTrue(n.getTitle().contains("المغرب"), n.getTitle());
        assertEquals("ar", n.getLanguage());
    }

    @Test
    void englishUserKeepsEnglishPrayerReminder() throws Exception {
        mirrorWithLanguage("en");
        consumers.onPrayerReminder(event("{\"userId\":\"" + userId + "\",\"prayer\":\"maghrib\",\"time\":\"2026-11-26T15:00:00Z\"}"));
        Notification n = lastSaved();
        assertEquals("Time for maghrib", n.getTitle());
        assertEquals("en", n.getLanguage());
    }

    @Test
    void unknownUserFallsBackToEnglish() throws Exception {
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.empty());
        consumers.onRevisionDue(event("{\"userId\":\"" + userId + "\",\"date\":\"2026-11-26\",\"itemCount\":3}"));
        assertEquals("Revision is due", lastSaved().getTitle());
    }

    @Test
    void revisionDueIsSkippedWhenTheUserTurnedRevisionRemindersOff() throws Exception {
        UserMirror mirror = UserMirror.builder().userId(userId).email("a@b.c").name("Omar").pushEnabled(true)
                .emailEnabled(true).prayerRemindersEnabled(true).azkarRemindersEnabled(true)
                .revisionRemindersEnabled(false).timezone("Africa/Cairo").language("en").build();
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.of(mirror));
        consumers.onRevisionDue(event("{\"userId\":\"" + userId + "\",\"date\":\"2026-11-26\",\"itemCount\":3}"));
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void revisionDueIsScheduledWhenEnabled() throws Exception {
        UserMirror mirror = UserMirror.builder().userId(userId).email("a@b.c").name("Omar").pushEnabled(true)
                .emailEnabled(true).prayerRemindersEnabled(true).azkarRemindersEnabled(true)
                .revisionRemindersEnabled(true).timezone("Africa/Cairo").language("ar").build();
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.of(mirror));
        consumers.onRevisionDue(event("{\"userId\":\"" + userId + "\",\"date\":\"2026-11-26\",\"itemCount\":3}"));
        assertEquals("ar", lastSaved().getLanguage());
    }

    @Test
    void registrationEmailUsesTheLanguageFromTheEvent() throws Exception {
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.empty());
        consumers.onUserRegistered(event("{\"userId\":\"" + userId
                + "\",\"email\":\"a@b.c\",\"name\":\"Omar\",\"verificationToken\":\"tok123\",\"language\":\"ar\"}"));
        ArgumentCaptor<UserMirror> mirror = ArgumentCaptor.forClass(UserMirror.class);
        verify(userMirrorRepository).save(mirror.capture());
        assertEquals("ar", mirror.getValue().getLanguage());
    }

    @Test
    void registrationWithoutLanguageDefaultsToEnglish() throws Exception {
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.empty());
        consumers.onUserRegistered(event("{\"userId\":\"" + userId
                + "\",\"email\":\"a@b.c\",\"name\":\"Omar\",\"verificationToken\":\"tok123\"}"));
        ArgumentCaptor<UserMirror> mirror = ArgumentCaptor.forClass(UserMirror.class);
        verify(userMirrorRepository).save(mirror.capture());
        assertEquals("en", mirror.getValue().getLanguage());
    }

    @Test
    void preferencesEventSwitchesTheStoredLanguage() throws Exception {
        mirrorWithLanguage("en");
        consumers.onPreferencesUpdated(event("{\"userId\":\"" + userId
                + "\",\"pushEnabled\":true,\"emailEnabled\":true,\"memorizationReminderTime\":\"\","
                + "\"revisionReminderTime\":\"\",\"timezone\":\"Africa/Cairo\",\"language\":\"ar\"}"));
        ArgumentCaptor<UserMirror> mirror = ArgumentCaptor.forClass(UserMirror.class);
        verify(userMirrorRepository).save(mirror.capture());
        assertEquals("ar", mirror.getValue().getLanguage());
    }

    @Test
    void preferencesEventWithoutLanguageKeepsTheExistingOne() throws Exception {
        mirrorWithLanguage("ar");
        consumers.onPreferencesUpdated(event("{\"userId\":\"" + userId
                + "\",\"pushEnabled\":true,\"emailEnabled\":true,\"memorizationReminderTime\":\"\","
                + "\"revisionReminderTime\":\"\",\"timezone\":\"Africa/Cairo\"}"));
        ArgumentCaptor<UserMirror> mirror = ArgumentCaptor.forClass(UserMirror.class);
        verify(userMirrorRepository).save(mirror.capture());
        assertEquals("ar", mirror.getValue().getLanguage());
    }

    @Test
    void everyTemplateRendersInBothLanguagesAndArabicHasArabicLetters() {
        for (String lang : new String[]{"en", "ar"}) {
            var all = java.util.List.of(
                    templates.emailVerification(lang, "Omar", "tok"), templates.passwordReset(lang, "tok"),
                    templates.memorizationTask(lang, "2026-11-26", 2, 1, 5), templates.revisionDue(lang, 2),
                    templates.prayerReminder(lang, "fajr"), templates.azkarReminder(lang, "EVENING"),
                    templates.streakMilestone(lang, 7, "AFTER_PRAYER"), templates.achievement(lang),
                    templates.coursePublished(lang, "Tajweed 101"), templates.enrollment(lang, "Tajweed 101"),
                    templates.recitationResult(lang, 92.5, 3), templates.badgeAwarded(lang, "First Step", "الخطوة الأولى"));
            for (var content : all) {
                assertFalse(content.title().isBlank());
                assertFalse(content.body().isBlank());
                boolean arabic = content.title().chars().anyMatch(c -> c >= 0x0600 && c <= 0x06FF);
                assertEquals("ar".equals(lang), arabic, content.title());
            }
        }
    }

    @Test
    void arabicMemorizationTaskNamesTheSurah() {
        assertTrue(templates.memorizationTask("ar", "2026-11-26", 2, 1, 5).body().contains("البقرة"));
        assertTrue(templates.memorizationTask("ar-EG", "2026-11-26", 114, 1, 6).body().contains("الناس"));
    }

    @Test
    void arabicTokensStayIntact() {
        assertTrue(templates.emailVerification("ar", "Omar", "tok-XYZ").body().contains("tok-XYZ"));
        assertTrue(templates.passwordReset("ar", "reset-123").body().contains("reset-123"));
    }

    @Test
    void surahNameTablesCoverAll114Surahs() {
        assertEquals(114, SurahNames.count());
        assertEquals("الفاتحة", SurahNames.name(1, true));
        assertEquals("Al-Fatihah", SurahNames.name(1, false));
        assertEquals("An-Nas", SurahNames.name(114, false));
        assertEquals("999", SurahNames.name(999, true));
    }
}
