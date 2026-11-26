package com.sabeel.revision;

import com.sabeel.revision.event.OutboxService;
import com.sabeel.revision.repository.ProcessedEventRepository;
import com.sabeel.revision.repository.RevisionItemRepository;
import com.sabeel.revision.repository.RevisionLogRepository;
import com.sabeel.revision.service.RevisionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TaskCompletedDedupTest {
    private RevisionItemRepository itemRepository;
    private ProcessedEventRepository processedEventRepository;
    private RevisionLogRepository logRepository;
    private OutboxService outboxService;
    private RevisionService service;

    @BeforeEach
    void setUp() {
        itemRepository = mock(RevisionItemRepository.class);
        processedEventRepository = mock(ProcessedEventRepository.class);
        logRepository = mock(RevisionLogRepository.class);
        outboxService = mock(OutboxService.class);
        service = new RevisionService(itemRepository, processedEventRepository, logRepository, outboxService);
    }

    @Test
    void duplicateEventIdIsSkippedAndDoesNotAdvanceTheLadder() {
        when(processedEventRepository.existsById("evt-1")).thenReturn(true);
        boolean processed = service.processTaskCompleted("evt-1", UUID.randomUUID(), 2, 1, 5, 0.95, LocalDate.now());
        assertFalse(processed);
        verifyNoInteractions(itemRepository);
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    void firstDeliveryRegistersItemAndRecordsMarker() {
        when(processedEventRepository.existsById("evt-2")).thenReturn(false);
        when(itemRepository.findByUserIdAndSurahIdAndFromAyahAndToAyah(any(), anyInt(), anyInt(), anyInt()))
                .thenReturn(Optional.empty());
        boolean processed = service.processTaskCompleted("evt-2", UUID.randomUUID(), 2, 1, 5, 0.95, LocalDate.now());
        assertTrue(processed);
        verify(itemRepository).save(any());
        verify(processedEventRepository).save(argThat(e -> e.getEventId().equals("evt-2")));
    }
}
