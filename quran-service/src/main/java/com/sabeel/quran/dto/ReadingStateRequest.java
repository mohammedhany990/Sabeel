package com.sabeel.quran.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ReadingStateRequest(@Min(1) @Max(6236) int lastAyahId) {
}
