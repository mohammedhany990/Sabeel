package com.sabeel.azkar;

import com.sabeel.azkar.domain.TasbeehCount;
import com.sabeel.azkar.dto.TasbeehResponse;
import com.sabeel.azkar.exception.ApiException;
import com.sabeel.azkar.repository.TasbeehCountRepository;
import com.sabeel.azkar.service.TasbeehService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TasbeehServiceTest {
    private final UUID user = UUID.randomUUID();
    private final LocalDate today = LocalDate.of(2026, 11, 26);
    private TasbeehCountRepository repository;
    private TasbeehService service;

    @BeforeEach
    void setUp() {
        repository = mock(TasbeehCountRepository.class);
        service = new TasbeehService(repository);
    }

    @Test
    void addsToAnExistingRow() {
        TasbeehCount.PK key = new TasbeehCount.PK(user, today, "SUBHANALLAH");
        when(repository.findById(key)).thenReturn(Optional.of(new TasbeehCount(user, today, "SUBHANALLAH", 33)));
        when(repository.findByUserId(user)).thenReturn(List.of(new TasbeehCount(user, today, "SUBHANALLAH", 66)));
        TasbeehResponse r = service.add(user, today, "subhanallah", 33);
        verify(repository).save(argThat(c -> c.getTotal() == 66));
        assertEquals(66L, r.today().get("SUBHANALLAH"));
    }

    @Test
    void createsARowWhenNoneExists() {
        when(repository.findById(any())).thenReturn(Optional.empty());
        service.add(user, today, "ALHAMDULILLAH", 5);
        verify(repository).save(argThat(c -> c.getTotal() == 5 && c.getPhrase().equals("ALHAMDULILLAH")));
    }

    @Test
    void rejectsUnknownPhrases() {
        assertThrows(ApiException.class, () -> service.add(user, today, "NOPE", 1));
    }

    @Test
    void lifetimeSumsAcrossDaysWhileTodayOnlyCountsToday() {
        when(repository.findByUserId(user)).thenReturn(List.of(
                new TasbeehCount(user, today, "ALLAHU_AKBAR", 10),
                new TasbeehCount(user, today.minusDays(1), "ALLAHU_AKBAR", 20)));
        TasbeehResponse r = service.summary(user, today);
        assertEquals(10L, r.today().get("ALLAHU_AKBAR"));
        assertEquals(30L, r.lifetime().get("ALLAHU_AKBAR"));
        assertEquals(0L, r.today().get("SALAWAT"));
    }
}
