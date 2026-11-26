package com.sabeel.azkar.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.azkar.domain.UserMirror;
import com.sabeel.azkar.repository.UserMirrorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

import static com.sabeel.azkar.config.KafkaConfig.TOPIC_PREFERENCES_UPDATED;
import static com.sabeel.azkar.config.KafkaConfig.TOPIC_USER_REGISTERED;

@Component
@RequiredArgsConstructor
public class UserEventsConsumer {
    private final UserMirrorRepository userMirrorRepository;
    private final EventIdempotency eventIdempotency;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC_USER_REGISTERED, groupId = "azkar-service")
    public void onUserRegistered(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        eventIdempotency.process(eventId, TOPIC_USER_REGISTERED, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            userMirrorRepository.findById(userId).orElseGet(() -> userMirrorRepository.save(
                    UserMirror.builder().userId(userId).updatedAt(Instant.now()).build()));
        });
    }

    @KafkaListener(topics = TOPIC_PREFERENCES_UPDATED, groupId = "azkar-service")
    public void onPreferencesUpdated(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        eventIdempotency.process(eventId, TOPIC_PREFERENCES_UPDATED, () -> {
            UUID userId = UUID.fromString(p.get("userId").asText());
            String timezone = p.has("timezone") ? p.get("timezone").asText("") : "";
            if (timezone.isBlank()) {
                return;
            }
            UserMirror mirror = userMirrorRepository.findById(userId).orElse(
                    UserMirror.builder().userId(userId).build());
            mirror.setTimezone(timezone);
            mirror.setUpdatedAt(Instant.now());
            userMirrorRepository.save(mirror);
        });
    }
}
