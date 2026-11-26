package com.sabeel.user.dto;

import java.time.LocalTime;

public record PreferencesResponse(boolean pushEnabled, boolean emailEnabled,
                                  LocalTime memorizationReminderTime, LocalTime revisionReminderTime,
                                  boolean prayerReminders, boolean azkarReminders) {
}
