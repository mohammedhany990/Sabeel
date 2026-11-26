package com.sabeel.memorization.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreatePlanRequest(
        @Min(1) @Max(114) int startingSurahId,
        @Min(1) int startingAyah,
        @Min(1) @Max(114) Integer targetSurahId,
        @NotNull LocalDate targetDate) {
}
