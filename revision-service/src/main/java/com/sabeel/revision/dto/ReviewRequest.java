package com.sabeel.revision.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ReviewRequest(@NotNull @DecimalMin("0") @DecimalMax("100") Double accuracy,
                            @Min(0) int mistakesCount) {
}
