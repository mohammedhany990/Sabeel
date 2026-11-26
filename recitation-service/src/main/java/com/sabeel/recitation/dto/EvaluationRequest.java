package com.sabeel.recitation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record EvaluationRequest(@Min(1) int surahId, @Min(1) int fromAyah, @Min(1) int toAyah,
                                String audioObjectKey, String audioUrl, String transcript,
                                @NotBlank String expectedText) {
}
