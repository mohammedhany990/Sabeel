package com.sabeel.quran.dto;

import java.time.Instant;

public record ReadingHistoryResponse(int ayahId, Instant readAt) {
}
