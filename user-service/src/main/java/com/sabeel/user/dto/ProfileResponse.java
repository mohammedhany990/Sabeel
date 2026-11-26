package com.sabeel.user.dto;

import java.time.Instant;
import java.util.UUID;

public record ProfileResponse(UUID userId, String name, String profileImageUrl, String country,
                              String timezone, Integer preferredReciterId, Instant createdAt, Instant updatedAt) {
}
