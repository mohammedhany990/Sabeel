package com.sabeel.learning.dto;

import jakarta.validation.constraints.NotBlank;

public record CourseRequest(@NotBlank String title, String description, @NotBlank String category,
                            String thumbnailUrl) {
}
