package com.sabeel.auth.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.auth.domain.OutboxEvent;
import com.sabeel.auth.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OutboxService {
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRED)
    public void record(String topic, String key, Object payload) {
        try {
            EventEnvelope envelope = new EventEnvelope(UUID.randomUUID().toString(), topic, 1, Instant.now(), payload);
            outboxEventRepository.save(OutboxEvent.builder()
                    .topic(topic)
                    .eventKey(key)
                    .payload(objectMapper.writeValueAsString(envelope))
                    .occurredAt(Instant.now())
                    .build());
        } catch (Exception e) {
            throw new IllegalStateException("failed to record outbox event " + topic, e);
        }
    }
}
