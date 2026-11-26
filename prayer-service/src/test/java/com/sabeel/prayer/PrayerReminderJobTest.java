package com.sabeel.prayer;

import com.sabeel.prayer.domain.PrayerReminderDay;
import com.sabeel.prayer.domain.PrayerSettings;
import com.sabeel.prayer.engine.CalculationMethod;
import com.sabeel.prayer.engine.PrayerTimesCalculator;
import com.sabeel.prayer.event.OutboxService;
import com.sabeel.prayer.repository.PrayerReminderDayRepository;
import com.sabeel.prayer.repository.PrayerSettingsRepository;
import com.sabeel.prayer.service.PrayerReminderJob;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PrayerReminderJobTest {
    private PrayerReminderDayRepository reminderDayRepository;
    private OutboxService outboxService;
    private PrayerReminderJob job;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        PrayerSettingsRepository settingsRepository = mock(PrayerSettingsRepository.class);
        reminderDayRepository = mock(PrayerReminderDayRepository.class);
        outboxService = mock(OutboxService.class);
        job = new PrayerReminderJob(settingsRepository, reminderDayRepository, new PrayerTimesCalculator(), outboxService);
    }

    private PrayerSettings settings(String timezone, double lat, double lng) {
        return PrayerSettings.builder().userId(userId).latitude(lat).longitude(lng)
                .method(CalculationMethod.EGYPT).timezone(timezone).asrFactor(1).build();
    }

    @Test
    void cairoUserAfterLocalMidnightGetsAllFivePrayersForTheNewLocalDate() {
        Instant now = Instant.parse("2026-06-15T22:30:00Z");
        int published = job.publishForUser(settings("Africa/Cairo", 30.0444, 31.2357), now);
        assertEquals(5, published);
        verify(outboxService, times(5)).record(eq("prayer.time.reminder"), eq(userId.toString()), any());
        verify(reminderDayRepository).save(argThat(d -> d.getLocalDate().equals(LocalDate.of(2026, 6, 16))));
    }

    @Test
    void newYorkUserAt0045UtcIsStillOnThePreviousLocalDaySoOnlyFuturePrayersAreScheduled() {
        Instant now = Instant.parse("2026-06-15T00:45:00Z");
        int published = job.publishForUser(settings("America/New_York", 40.7128, -74.0060), now);
        assertEquals(1, published);
        verify(reminderDayRepository).save(argThat(d -> d.getLocalDate().equals(LocalDate.of(2026, 6, 14))));
    }

    @Test
    void newYorkUserIsScheduledOnceTheirLocalDateRollsOver() {
        Instant now = Instant.parse("2026-06-15T04:05:00Z");
        int published = job.publishForUser(settings("America/New_York", 40.7128, -74.0060), now);
        assertEquals(5, published);
        verify(reminderDayRepository).save(argThat(d -> d.getLocalDate().equals(LocalDate.of(2026, 6, 15))));
    }

    @Test
    void alreadyScheduledLocalDateIsNotDuplicatedOnLaterRuns() {
        when(reminderDayRepository.existsByUserIdAndLocalDate(eq(userId), any())).thenReturn(true);
        int published = job.publishForUser(settings("Africa/Cairo", 30.0444, 31.2357),
                Instant.parse("2026-06-15T22:30:00Z"));
        assertEquals(0, published);
        verify(outboxService, never()).record(any(), any(), any());
        verify(reminderDayRepository, never()).save(any());
    }

    @Test
    void pastPrayersAreNotScheduledWhenTheDayIsPartlyOver() {
        Instant now = Instant.parse("2026-06-16T10:30:00Z");
        int published = job.publishForUser(settings("Africa/Cairo", 30.0444, 31.2357), now);
        assertTrue(published < 5 && published > 0);
        verify(outboxService, times(published)).record(eq("prayer.time.reminder"), eq(userId.toString()), any());
    }
}
