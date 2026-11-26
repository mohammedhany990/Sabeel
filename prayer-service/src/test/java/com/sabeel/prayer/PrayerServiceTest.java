package com.sabeel.prayer;

import com.sabeel.prayer.domain.PrayerSettings;
import com.sabeel.prayer.dto.SettingsRequest;
import com.sabeel.prayer.engine.HijriCalendar;
import com.sabeel.prayer.engine.PrayerTimesCalculator;
import com.sabeel.prayer.engine.QiblaCalculator;
import com.sabeel.prayer.event.OutboxService;
import com.sabeel.prayer.exception.ApiException;
import com.sabeel.prayer.repository.PrayerReminderDayRepository;
import com.sabeel.prayer.repository.PrayerSettingsRepository;
import com.sabeel.prayer.service.PrayerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PrayerServiceTest {
    private PrayerSettingsRepository settingsRepository;
    private PrayerReminderDayRepository reminderDayRepository;
    private OutboxService outboxService;
    private PrayerService service;

    @BeforeEach
    void setUp() {
        settingsRepository = mock(PrayerSettingsRepository.class);
        reminderDayRepository = mock(PrayerReminderDayRepository.class);
        outboxService = mock(OutboxService.class);
        service = new PrayerService(settingsRepository, reminderDayRepository, outboxService,
                new PrayerTimesCalculator(), new QiblaCalculator(), new HijriCalendar());
    }

    @Test
    void highLatitudeDateReturnsAProblemNotAnOpaqueServerError() {
        ApiException ex = assertThrows(ApiException.class, () ->
                service.times(null, LocalDate.of(2026, 6, 21), 70.0, 25.0, "EGYPT"));
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, ex.getStatus());
        assertTrue(ex.getMessage().contains("High-latitude adjustment is not implemented"));
    }

    @Test
    void normalLatitudeStillComputes() {
        var response = service.times(null, LocalDate.of(2026, 3, 10), 30.0444, 31.2357, "EGYPT");
        assertEquals(6, response.times().size());
    }

    @Test
    void savingSettingsClearsScheduledDaysSoRemindersAreRecomputed() {
        UUID userId = UUID.randomUUID();
        when(settingsRepository.save(any(PrayerSettings.class))).thenAnswer(inv -> inv.getArgument(0));
        service.saveSettings(userId, new SettingsRequest(30.0444, 31.2357, "EGYPT", "Africa/Cairo", 1));
        verify(reminderDayRepository).deleteByUserId(userId);
        verify(outboxService).record(eq("prayer.settings.updated"), eq(userId.toString()), any());
    }
}
