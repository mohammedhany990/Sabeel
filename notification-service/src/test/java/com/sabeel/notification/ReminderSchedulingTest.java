package com.sabeel.notification;

import com.sabeel.notification.service.NotificationService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class ReminderSchedulingTest {
    private final NotificationService service = new NotificationService(null, null, null, null, null, null);

    @Test
    void schedulesAtUserLocalReminderTime() {
        Instant result = service.reminderInstant("2026-11-27", LocalTime.of(6, 30), "Africa/Cairo");
        assertThat(result).isEqualTo(Instant.parse("2026-11-27T04:30:00Z"));
    }

    @Test
    void fallsBackToNowWithoutReminderTime() {
        Instant before = Instant.now();
        Instant result = service.reminderInstant("2026-11-27", null, "Africa/Cairo");
        assertThat(result).isAfterOrEqualTo(before);
    }

    @Test
    void invalidTimezoneFallsBackToUtc() {
        Instant result = service.reminderInstant("2026-11-27", LocalTime.of(6, 30), "not/a-zone");
        assertThat(result).isEqualTo(Instant.parse("2026-11-27T06:30:00Z"));
    }
}
