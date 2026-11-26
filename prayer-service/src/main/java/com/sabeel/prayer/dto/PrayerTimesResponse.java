package com.sabeel.prayer.dto;

import java.time.ZonedDateTime;
import java.util.Map;

public record PrayerTimesResponse(String date, String method, String timezone,
                                  Map<String, ZonedDateTime> times, String hijriDate) {
}
