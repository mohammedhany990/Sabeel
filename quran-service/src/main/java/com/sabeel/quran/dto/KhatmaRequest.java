package com.sabeel.quran.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record KhatmaRequest(@Min(1) @Max(730) int days) {
}
