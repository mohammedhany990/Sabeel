package com.sabeel.user.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.user.service.ProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

import static com.sabeel.user.config.KafkaConfig.TOPIC_USER_REGISTERED;

@Component
@RequiredArgsConstructor
@Slf4j
public class RegistrationConsumer {
    private final ProfileService profileService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC_USER_REGISTERED, groupId = "user-service")
    public void onUserRegistered(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        JsonNode payload = envelope.get("payload");
        UUID userId = UUID.fromString(payload.get("userId").asText());
        profileService.createFromRegistration(userId, payload.get("name").asText(),
                payload.has("language") ? payload.get("language").asText() : null);
        log.info("profile ensured for user {}", userId);
    }
}
