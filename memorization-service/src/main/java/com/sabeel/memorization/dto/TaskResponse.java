package com.sabeel.memorization.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record TaskResponse(UUID id, LocalDate taskDate, int surahId, int fromAyah, int toAyah,
                           String taskType, boolean completed, Instant completedAt) {
}
