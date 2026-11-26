package com.sabeel.learning.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record ProgressRequest(@NotBlank String enrollmentId, @NotBlank String lessonId,
                              @Min(1) int watchedSeconds) {
}
