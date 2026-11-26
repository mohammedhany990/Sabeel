package com.sabeel.quran.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record BookmarkRequest(@Min(1) @Max(6236) int ayahId, @Size(max = 500) String note) {
}
