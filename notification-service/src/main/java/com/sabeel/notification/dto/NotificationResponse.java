package com.sabeel.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(UUID id, String type, String title, String body,
                                   String channel, String status, Instant createdAt, Instant readAt,
                                   String language) {
}
