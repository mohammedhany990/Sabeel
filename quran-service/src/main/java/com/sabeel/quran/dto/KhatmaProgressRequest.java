package com.sabeel.quran.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record KhatmaProgressRequest(@Min(0) @Max(604) int page) {
}
