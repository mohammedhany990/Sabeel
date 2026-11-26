package com.sabeel.user.dto;

import java.time.LocalTime;

public record PreferencesRequest(Boolean pushEnabled, Boolean emailEnabled,
                                 LocalTime memorizationReminderTime, LocalTime revisionReminderTime,
                                 Boolean prayerReminders, Boolean azkarReminders,
                                 Boolean revisionReminders) {
}
