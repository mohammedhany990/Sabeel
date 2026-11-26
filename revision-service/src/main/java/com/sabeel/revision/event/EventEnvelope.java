package com.sabeel.revision.event;

import java.time.Instant;

public record EventEnvelope(String eventId, String eventType, int eventVersion, Instant occurredAt, Object payload) {
}
