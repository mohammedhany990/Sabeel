package com.sabeel.quran.dto;

import java.time.Instant;

public record ReadingStateResponse(int lastAyahId, Instant lastReadAt) {
}
