package com.sabeel.notification;

import com.sabeel.notification.domain.ProcessedEvent;
import com.sabeel.notification.repository.DeviceTokenMirrorRepository;
import com.sabeel.notification.repository.NotificationRepository;
import com.sabeel.notification.repository.ProcessedEventRepository;
import com.sabeel.notification.repository.UserMirrorRepository;
import com.sabeel.notification.service.EmailSender;
import com.sabeel.notification.service.NotificationService;
import com.sabeel.notification.service.PushSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProcessEventTest {
    private ProcessedEventRepository processedEventRepository;
    private NotificationService service;

    @BeforeEach
    void setUp() {
        processedEventRepository = mock(ProcessedEventRepository.class);
        service = new NotificationService(
                mock(NotificationRepository.class),
                processedEventRepository,
                mock(UserMirrorRepository.class),
                mock(DeviceTokenMirrorRepository.class),
                mock(EmailSender.class),
                mock(PushSender.class));
    }

    @Test
    void duplicateEventIsSkippedWithoutRunningWork() {
        when(processedEventRepository.existsById("evt-dup")).thenReturn(true);
        AtomicBoolean ran = new AtomicBoolean(false);
        boolean processed = service.processEvent("evt-dup", "topic", () -> ran.set(true));
        assertFalse(processed);
        assertFalse(ran.get());
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    void failedWorkLeavesNoMarkerSoRedeliveryRetries() {
        when(processedEventRepository.existsById("evt-fail")).thenReturn(false);
        assertThrows(RuntimeException.class, () ->
                service.processEvent("evt-fail", "topic", () -> {
                    throw new RuntimeException("smtp down");
                }));
        verify(processedEventRepository, never()).save(any(ProcessedEvent.class));
    }

    @Test
    void successfulWorkIsMarkedProcessedExactlyOnce() {
        when(processedEventRepository.existsById("evt-ok")).thenReturn(false);
        AtomicBoolean ran = new AtomicBoolean(false);
        boolean processed = service.processEvent("evt-ok", "topic", () -> ran.set(true));
        assertTrue(processed);
        assertTrue(ran.get());
        verify(processedEventRepository, times(1))
                .save(argThat(e -> e.getEventId().equals("evt-ok") && e.getTopic().equals("topic")));
    }
}
