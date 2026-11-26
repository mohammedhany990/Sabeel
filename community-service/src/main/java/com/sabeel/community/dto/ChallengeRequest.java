package com.sabeel.community.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ChallengeRequest(@NotBlank String title, String description, @NotBlank String metric,
                               @Min(1) int targetValue, @NotNull String startsAt, @NotNull String endsAt) {
}
