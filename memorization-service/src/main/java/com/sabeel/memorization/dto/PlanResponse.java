package com.sabeel.memorization.dto;

import java.time.LocalDate;
import java.util.UUID;

public record PlanResponse(UUID id, int startingSurahId, int startingAyah, int targetSurahId,
                           LocalDate startDate, LocalDate targetDate, int dailyAyahTarget, int weeklyAyahTarget,
                           String status, int currentSurahId, int currentAyah) {
}
