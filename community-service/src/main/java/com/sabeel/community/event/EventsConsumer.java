package com.sabeel.community.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.community.service.BadgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

import static com.sabeel.community.config.KafkaConfig.TOPIC_PLAN_COMPLETED;
import static com.sabeel.community.config.KafkaConfig.TOPIC_STREAK_MILESTONE;
import static com.sabeel.community.config.KafkaConfig.TOPIC_TASK_COMPLETED;

@Component
@RequiredArgsConstructor
public class EventsConsumer {
    private final BadgeService badgeService;
    private final EventIdempotency eventIdempotency;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC_TASK_COMPLETED, groupId = "community-service")
    public void onTaskCompleted(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        eventIdempotency.process(eventId, TOPIC_TASK_COMPLETED, () ->
                badgeService.onTaskCompleted(UUID.fromString(p.get("userId").asText())));
    }

    @KafkaListener(topics = TOPIC_PLAN_COMPLETED, groupId = "community-service")
    public void onPlanCompleted(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        eventIdempotency.process(eventId, TOPIC_PLAN_COMPLETED, () ->
                badgeService.onPlanCompleted(UUID.fromString(p.get("userId").asText())));
    }

    @KafkaListener(topics = TOPIC_STREAK_MILESTONE, groupId = "community-service")
    public void onStreakMilestone(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        eventIdempotency.process(eventId, TOPIC_STREAK_MILESTONE, () ->
                badgeService.onStreakMilestone(UUID.fromString(p.get("userId").asText()),
                        p.get("streakDays").asLong()));
    }
}
