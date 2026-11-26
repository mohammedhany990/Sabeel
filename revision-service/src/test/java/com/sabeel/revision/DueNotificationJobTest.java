package com.sabeel.revision;

import com.sabeel.revision.domain.Difficulty;
import com.sabeel.revision.domain.RevisionItem;
import com.sabeel.revision.domain.RevisionStatus;
import com.sabeel.revision.event.OutboxService;
import com.sabeel.revision.repository.RevisionItemRepository;
import com.sabeel.revision.service.DueNotificationJob;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DueNotificationJobTest {
    private RevisionItemRepository itemRepository;
    private OutboxService outboxService;
    private DueNotificationJob job;

    @BeforeEach
    void setUp() {
        itemRepository = mock(RevisionItemRepository.class);
        outboxService = mock(OutboxService.class);
        job = new DueNotificationJob(itemRepository, outboxService);
    }

    private RevisionItem item(UUID userId, int surah, int from, int to) {
        return RevisionItem.builder().userId(userId).surahId(surah).fromAyah(from).toAyah(to)
                .memorizedAt(LocalDate.now().minusDays(3)).intervalDays(1).easeFactor(2.5).repetitions(1)
                .nextRevisionDate(LocalDate.now().plusDays(1)).difficulty(Difficulty.NORMAL)
                .status(RevisionStatus.SCHEDULED).build();
    }

    @Test
    void oneEventPerUserWithTheItemCountAndRanges() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(itemRepository.findByNextRevisionDateLessThanEqualAndStatusNot(any(), eq(RevisionStatus.MASTERED)))
                .thenReturn(List.of(item(a, 2, 1, 5), item(a, 3, 1, 10), item(b, 1, 1, 7)));
        job.publishDueRevisions();
        verify(outboxService).record(eq("revision.due"), eq(a.toString()), argThat(p -> {
            Map<?, ?> m = (Map<?, ?>) p;
            return Integer.valueOf(2).equals(m.get("itemCount")) && a.toString().equals(m.get("userId"))
                    && List.of("2:1-5", "3:1-10").equals(m.get("ranges"));
        }));
        verify(outboxService).record(eq("revision.due"), eq(b.toString()), argThat(p ->
                Integer.valueOf(1).equals(((Map<?, ?>) p).get("itemCount"))));
    }

    @Test
    void dueItemsAreMarkedDue() {
        RevisionItem i = item(UUID.randomUUID(), 2, 1, 5);
        when(itemRepository.findByNextRevisionDateLessThanEqualAndStatusNot(any(), any())).thenReturn(List.of(i));
        job.publishDueRevisions();
        assertEquals(RevisionStatus.DUE, i.getStatus());
        verify(itemRepository).save(i);
    }

    @Test
    void nothingIsPublishedWhenNothingIsDue() {
        when(itemRepository.findByNextRevisionDateLessThanEqualAndStatusNot(any(), any())).thenReturn(List.of());
        job.publishDueRevisions();
        verifyNoInteractions(outboxService);
    }

    @Test
    void queryLooksAtTomorrowAndExcludesMastered() {
        when(itemRepository.findByNextRevisionDateLessThanEqualAndStatusNot(any(), any())).thenReturn(List.of());
        job.publishDueRevisions();
        verify(itemRepository).findByNextRevisionDateLessThanEqualAndStatusNot(
                LocalDate.now().plusDays(1), RevisionStatus.MASTERED);
    }

    @Test
    void jobIsScheduledByACronThatCanBeConfigured() throws Exception {
        Scheduled s = DueNotificationJob.class.getMethod("publishDueRevisions").getAnnotation(Scheduled.class);
        assertNotNull(s);
        assertTrue(s.cron().contains("revision.due-check-cron"));
    }
}
