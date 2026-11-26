package com.sabeel.prayer.dto;

import java.util.List;
import java.util.Map;

public record PrayerTrackerResponse(String from, String to, Map<String, List<String>> days,
                                    int currentStreak, int bestStreakInRange, int prayedInRange, int possibleInRange) {
}
