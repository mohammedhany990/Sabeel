package com.sabeel.recitation.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.recitation.service.RecitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

import static com.sabeel.recitation.config.KafkaConfig.TOPIC_EVALUATION_REQUESTED;

@Component
@RequiredArgsConstructor
public class EvaluationWorker {
    private final RecitationService recitationService;
    private final EventIdempotency eventIdempotency;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC_EVALUATION_REQUESTED, groupId = "recitation-service-worker")
    public void onEvaluationRequested(String message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message);
        String eventId = envelope.get("eventId").asText();
        JsonNode p = envelope.get("payload");
        eventIdempotency.process(eventId, TOPIC_EVALUATION_REQUESTED, () ->
                recitationService.execute(UUID.fromString(p.get("jobId").asText())));
    }
}
