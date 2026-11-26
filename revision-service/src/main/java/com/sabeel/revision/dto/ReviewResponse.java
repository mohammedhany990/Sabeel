package com.sabeel.revision.dto;

import java.time.LocalDate;
import java.util.UUID;

public record ReviewResponse(UUID itemId, int nextIntervalDays, LocalDate nextRevisionDate,
                             String difficulty, boolean mastered) {
}
