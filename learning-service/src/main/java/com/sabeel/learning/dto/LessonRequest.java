package com.sabeel.learning.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record LessonRequest(@NotBlank String title, @NotBlank String videoUrl,
                            @Min(1) int durationSec, String description, @Min(0) int sortOrder) {
}
