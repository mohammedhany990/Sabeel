package com.sabeel.prayer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PrayerLogRequest(@NotNull String date, @NotBlank String prayer, boolean prayed) {
}
