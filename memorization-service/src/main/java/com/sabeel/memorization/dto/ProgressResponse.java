package com.sabeel.memorization.dto;

import java.util.UUID;

public record ProgressResponse(UUID planId, String status, int totalAyahs, long memorizedAyahs,
                               double progressPercent, int currentSurahId, int currentAyah,
                               int dailyAyahTarget, long daysRemaining) {
}
