package com.sabeel.notification;

import com.sabeel.notification.domain.Notification;
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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NaturalKeyDedupTest {
    private NotificationRepository notificationRepository;
    private NotificationService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        service = new NotificationService(notificationRepository, mock(ProcessedEventRepository.class),
                mock(UserMirrorRepository.class), mock(DeviceTokenMirrorRepository.class),
                mock(EmailSender.class), mock(PushSender.class));
    }

    private Notification pending(String type, Instant at) {
        return Notification.builder().userId(userId).type(type).title("t").body("b")
                .channel(Notification.Channel.PUSH).status(Notification.Status.PENDING)
                .scheduledFor(at).createdAt(Instant.now()).build();
    }

    @Test
    void republishedReminderCancelsTheIdenticalQueuedCopyBeforeInserting() {
        Instant at = Instant.parse("2026-06-16T03:05:00Z");
        Notification existing = pending("PRAYER_REMINDER", at);
        when(notificationRepository.findByUserIdAndTypeAndStatus(userId, "PRAYER_REMINDER", Notification.Status.PENDING))
                .thenReturn(List.of(existing));
        service.scheduleDeduped(userId, "PRAYER_REMINDER", "Time for fajr", "b", Notification.Channel.PUSH, at);
        assertEquals(Notification.Status.CANCELLED, existing.getStatus());
        verify(notificationRepository).save(existing);
        verify(notificationRepository).save(argThat(n -> n.getStatus() == Notification.Status.PENDING
                && n.getScheduledFor().equals(at) && n != existing));
    }

    @Test
    void queuedRemindersAtOtherTimesAreUntouched() {
        Instant at = Instant.parse("2026-06-16T03:05:00Z");
        Notification otherTime = pending("PRAYER_REMINDER", Instant.parse("2026-06-16T12:05:00Z"));
        Notification otherType = pending("AZKAR_REMINDER", at);
        when(notificationRepository.findByUserIdAndTypeAndStatus(userId, "PRAYER_REMINDER", Notification.Status.PENDING))
                .thenReturn(List.of(otherTime));
        service.scheduleDeduped(userId, "PRAYER_REMINDER", "Time for fajr", "b", Notification.Channel.PUSH, at);
        assertEquals(Notification.Status.PENDING, otherTime.getStatus());
        assertEquals(Notification.Status.PENDING, otherType.getStatus());
    }
}
