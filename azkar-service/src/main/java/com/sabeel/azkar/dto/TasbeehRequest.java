package com.sabeel.azkar.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record TasbeehRequest(@NotBlank String phrase, @Min(1) @Max(1000) int count) {
}
