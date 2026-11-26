package com.sabeel.revision.dto;

import java.time.LocalDate;
import java.util.UUID;

public record RevisionItemResponse(UUID id, int surahId, int fromAyah, int toAyah, LocalDate nextRevisionDate,
                                   int intervalDays, Double lastAccuracy, String difficulty, String status) {
}
