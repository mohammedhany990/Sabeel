package com.sabeel.quran.service;

import com.sabeel.quran.domain.Khatma;
import com.sabeel.quran.dto.KhatmaResponse;
import com.sabeel.quran.exception.ApiException;
import com.sabeel.quran.repository.KhatmaRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class KhatmaServiceTest {
    private final KhatmaRepository repository = mock(KhatmaRepository.class);
    private final KhatmaService service = new KhatmaService(repository);
    private final UUID user = UUID.randomUUID();
    private final LocalDate day = LocalDate.of(2026, 1, 1);

    private Khatma khatma(int page) {
        return Khatma.builder().id(UUID.randomUUID()).userId(user).startDate(day).targetDate(day.plusDays(30)).currentPage(page).build();
    }

    @Test
    void startComputesDailyTarget() {
        when(repository.findFirstByUserIdAndCompletedOnIsNullOrderByStartDateDesc(user)).thenReturn(Optional.empty());
        when(repository.save(any(Khatma.class))).thenAnswer(i -> i.getArgument(0));
        KhatmaResponse r = service.start(user, 30, day);
        assertEquals(0, r.currentPage());
        assertEquals(21, r.pagesPerDay());
        assertEquals(30, r.daysLeft());
        assertFalse(r.completed());
    }

    @Test
    void secondActiveKhatmaIsRejected() {
        when(repository.findFirstByUserIdAndCompletedOnIsNullOrderByStartDateDesc(user)).thenReturn(Optional.of(khatma(5)));
        assertThrows(ApiException.class, () -> service.start(user, 30, day));
    }

    @Test
    void reachingLastPageCompletes() {
        Khatma k = khatma(500);
        when(repository.findFirstByUserIdAndCompletedOnIsNullOrderByStartDateDesc(user)).thenReturn(Optional.of(k));
        when(repository.save(any(Khatma.class))).thenAnswer(i -> i.getArgument(0));
        KhatmaResponse r = service.progress(user, 604, day.plusDays(20));
        assertTrue(r.completed());
        assertEquals(100, r.percent());
        assertEquals(0, r.pagesPerDay());
        assertEquals(day.plusDays(20).toString(), r.completedOn());
    }

    @Test
    void behindScheduleIsNotOnTrack() {
        Khatma k = khatma(10);
        KhatmaResponse r = KhatmaService.toResponse(k, day.plusDays(15));
        assertFalse(r.onTrack());
        assertEquals(40, r.pagesPerDay());
    }

    @Test
    void progressWithoutKhatmaIsNotFound() {
        when(repository.findFirstByUserIdAndCompletedOnIsNullOrderByStartDateDesc(user)).thenReturn(Optional.empty());
        assertThrows(ApiException.class, () -> service.progress(user, 3, day));
    }
}
