package com.sabeel.quran.dto;

import java.time.Instant;
import java.util.UUID;

public record BookmarkResponse(UUID id, int ayahId, String note, Instant createdAt) {
}
