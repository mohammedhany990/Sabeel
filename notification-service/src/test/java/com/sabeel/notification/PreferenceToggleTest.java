package com.sabeel.notification;

import com.sabeel.notification.domain.Notification;
import com.sabeel.notification.domain.UserMirror;
import com.sabeel.notification.repository.DeviceTokenMirrorRepository;
import com.sabeel.notification.repository.NotificationRepository;
import com.sabeel.notification.repository.ProcessedEventRepository;
import com.sabeel.notification.repository.UserMirrorRepository;
import com.sabeel.notification.service.EmailSender;
import com.sabeel.notification.service.NotificationService;
import com.sabeel.notification.service.PushSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PreferenceToggleTest {
    private NotificationRepository notificationRepository;
    private UserMirrorRepository userMirrorRepository;
    private NotificationService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        userMirrorRepository = mock(UserMirrorRepository.class);
        service = new NotificationService(notificationRepository, mock(ProcessedEventRepository.class),
                userMirrorRepository, mock(DeviceTokenMirrorRepository.class),
                mock(EmailSender.class), mock(PushSender.class));
    }

    private UserMirror mirror(boolean prayer, boolean azkar) {
        return UserMirror.builder().userId(userId).email("a@b.c").name("A")
                .pushEnabled(true).emailEnabled(true).timezone("Africa/Cairo")
                .prayerRemindersEnabled(prayer).azkarRemindersEnabled(azkar).build();
    }

    @Test
    void prayerAndAzkarTogglesArePropagatedToTheMirror() {
        UserMirror existing = mirror(true, true);
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.of(existing));
        service.applyPreferences(userId, true, true, "", "", "Africa/Cairo", false, true);
        assertFalse(existing.isPrayerRemindersEnabled());
        assertTrue(existing.isAzkarRemindersEnabled());
        verify(userMirrorRepository).save(existing);
    }

    @Test
    void disablingPrayerRemindersCancelsAlreadyQueuedPrayerNotifications() {
        UserMirror existing = mirror(true, true);
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.of(existing));
        Notification queued = Notification.builder().userId(userId).type("PRAYER_REMINDER")
                .title("t").body("b").channel(Notification.Channel.PUSH)
                .status(Notification.Status.PENDING).scheduledFor(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now()).build();
        when(notificationRepository.findByUserIdAndTypeAndStatus(userId, "PRAYER_REMINDER", Notification.Status.PENDING))
                .thenReturn(List.of(queued));
        service.applyPreferences(userId, true, true, "", "", "Africa/Cairo", false, true);
        assertEquals(Notification.Status.CANCELLED, queued.getStatus());
        verify(notificationRepository).save(queued);
    }

    @Test
    void disablingAzkarRemindersCancelsAlreadyQueuedAzkarNotifications() {
        UserMirror existing = mirror(true, true);
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.of(existing));
        Notification queued = Notification.builder().userId(userId).type("AZKAR_REMINDER")
                .title("t").body("b").channel(Notification.Channel.PUSH)
                .status(Notification.Status.PENDING).scheduledFor(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now()).build();
        when(notificationRepository.findByUserIdAndTypeAndStatus(userId, "AZKAR_REMINDER", Notification.Status.PENDING))
                .thenReturn(List.of(queued));
        service.applyPreferences(userId, true, true, "", "", "Africa/Cairo", true, false);
        assertEquals(Notification.Status.CANCELLED, queued.getStatus());
    }

    @Test
    void revisionToggleIsPropagatedAndCancelsQueuedRevisionNotifications() {
        UserMirror existing = mirror(true, true);
        existing.setRevisionRemindersEnabled(true);
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.of(existing));
        Notification queued = Notification.builder().userId(userId).type("REVISION_DUE")
                .title("t").body("b").channel(Notification.Channel.PUSH)
                .status(Notification.Status.PENDING).scheduledFor(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now()).build();
        when(notificationRepository.findByUserIdAndTypeAndStatus(userId, "REVISION_DUE", Notification.Status.PENDING))
                .thenReturn(List.of(queued));
        service.applyPreferences(userId, true, true, "", "", "Africa/Cairo", true, true, null, false);
        assertFalse(existing.isRevisionRemindersEnabled());
        assertEquals(Notification.Status.CANCELLED, queued.getStatus());
    }

    @Test
    void enabledChecksDefaultToTrueWithoutAMirror() {
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.empty());
        assertTrue(service.prayerRemindersEnabled(userId));
        assertTrue(service.azkarRemindersEnabled(userId));
        assertTrue(service.revisionRemindersEnabled(userId));
    }

    @Test
    void enabledChecksReadTheMirror() {
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.of(mirror(false, true)));
        assertFalse(service.prayerRemindersEnabled(userId));
        assertTrue(service.azkarRemindersEnabled(userId));
    }
}
