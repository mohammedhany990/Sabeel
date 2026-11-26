package com.sabeel.azkar.dto;

import java.time.LocalDate;

public record StreakResponse(String categoryCode, int currentStreak, int longestStreak, LocalDate lastCompletedDate) {
}
