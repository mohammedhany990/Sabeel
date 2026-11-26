package com.sabeel.prayer;

import com.sabeel.prayer.domain.PrayerLog;
import com.sabeel.prayer.domain.PrayerSettings;
import com.sabeel.prayer.dto.PrayerLogRequest;
import com.sabeel.prayer.dto.PrayerTrackerResponse;
import com.sabeel.prayer.exception.ApiException;
import com.sabeel.prayer.repository.PrayerLogRepository;
import com.sabeel.prayer.repository.PrayerSettingsRepository;
import com.sabeel.prayer.service.PrayerTrackerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PrayerTrackerServiceTest {
    private final UUID user = UUID.randomUUID();
    private PrayerLogRepository repository;
    private PrayerTrackerService service;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        repository = mock(PrayerLogRepository.class);
        PrayerSettingsRepository settings = mock(PrayerSettingsRepository.class);
        PrayerSettings saved = new PrayerSettings();
        saved.setTimezone("UTC");
        when(settings.findById(user)).thenReturn(Optional.of(saved));
        service = new PrayerTrackerService(repository, settings);
        today = LocalDate.now(ZoneId.of("UTC"));
    }

    private List<PrayerLog> fullDay(LocalDate d) {
        List<PrayerLog> logs = new ArrayList<>();
        for (String p : PrayerTrackerService.DAILY) {
            logs.add(new PrayerLog(user, d, p));
        }
        return logs;
    }

    @Test
    void marksAPrayerAsPrayed() {
        service.log(user, new PrayerLogRequest(today.toString(), "fajr", true));
        org.mockito.ArgumentCaptor<PrayerLog> captor = org.mockito.ArgumentCaptor.forClass(PrayerLog.class);
        verify(repository).save(captor.capture());
        assertEquals("FAJR", captor.getValue().getPrayer());
        assertEquals(today, captor.getValue().getLocalDate());
    }

    @Test
    void sunriseIsNotATrackedPrayer() {
        assertThrows(ApiException.class, () -> service.log(user, new PrayerLogRequest(today.toString(), "SUNRISE", true)));
    }

    @Test
    void futureDatesAreRejected() {
        assertThrows(ApiException.class, () -> service.log(user, new PrayerLogRequest(today.plusDays(2).toString(), "FAJR", true)));
    }

    @Test
    void unmarkingRemovesTheRow() {
        PrayerLog.PK key = new PrayerLog.PK(user, today, "ASR");
        when(repository.existsById(key)).thenReturn(true);
        service.log(user, new PrayerLogRequest(today.toString(), "ASR", false));
        verify(repository).deleteById(key);
    }

    @Test
    void streakCountsConsecutiveCompleteDaysEndingTodayOrYesterday() {
        List<PrayerLog> logs = new ArrayList<>();
        logs.addAll(fullDay(today.minusDays(1)));
        logs.addAll(fullDay(today.minusDays(2)));
        logs.addAll(fullDay(today.minusDays(4)));
        when(repository.findByUserIdAndLocalDateBetween(any(), any(), any())).thenReturn(logs);
        PrayerTrackerResponse r = service.range(user, today.minusDays(6).toString(), today.toString());
        assertEquals(2, r.currentStreak());
        assertEquals(2, r.bestStreakInRange());
        assertEquals(15, r.prayedInRange());
        assertEquals(35, r.possibleInRange());
        assertEquals(7, r.days().size());
    }

    @Test
    void anIncompleteDayBreaksTheStreak() {
        List<PrayerLog> logs = new ArrayList<>(fullDay(today.minusDays(2)));
        logs.add(new PrayerLog(user, today.minusDays(1), "FAJR"));
        when(repository.findByUserIdAndLocalDateBetween(any(), any(), any())).thenReturn(logs);
        assertEquals(0, service.range(user, today.minusDays(6).toString(), today.toString()).currentStreak());
    }

    @Test
    void oversizedRangeIsRejected() {
        assertThrows(ApiException.class, () -> service.range(user, today.minusDays(400).toString(), today.toString()));
    }
}
