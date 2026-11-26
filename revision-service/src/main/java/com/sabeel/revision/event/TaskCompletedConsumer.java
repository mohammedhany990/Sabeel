package com.sabeel.revision.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.revision.service.RevisionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static com.sabeel.revision.config.KafkaConfig.TOPIC_TASK_COMPLETED;

@Component
@RequiredArgsConstructor
@Slf4j
public class TaskCompletedConsumer {
    private final RevisionService revisionService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC_TASK_COMPLETED, groupId = "revision-service")
    public void onTaskCompleted(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode payload = envelope.get("payload");
        boolean processed = revisionService.processTaskCompleted(
                eventId,
                UUID.fromString(payload.get("userId").asText()),
                payload.get("surahId").asInt(),
                payload.get("fromAyah").asInt(),
                payload.get("toAyah").asInt(),
                payload.get("accuracy").asDouble(),
                Instant.parse(payload.get("completedAt").asText()).atZone(ZoneOffset.UTC).toLocalDate());
        if (processed) {
            log.info("revision item ensured for user {} range {}:{}-{}",
                    payload.get("userId").asText(), payload.get("surahId").asInt(),
                    payload.get("fromAyah").asInt(), payload.get("toAyah").asInt());
        } else {
            log.info("duplicate memorization.task.completed {} skipped", eventId);
        }
    }
}
