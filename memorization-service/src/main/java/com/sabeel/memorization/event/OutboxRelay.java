package com.sabeel.memorization.event;

import com.sabeel.memorization.domain.OutboxEvent;
import com.sabeel.memorization.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxRelay {
    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelayString = "${memorization.outbox-relay-ms:5000}")
    @Transactional
    public void publishPending() {
        List<OutboxEvent> pending = outboxEventRepository.findTop50ByPublishedAtIsNullAndDeadAtIsNullOrderByOccurredAt();
        for (OutboxEvent event : pending) {
            try {
                kafkaTemplate.send(event.getTopic(), event.getEventKey(), event.getPayload()).get();
                event.setPublishedAt(Instant.now());
                outboxEventRepository.save(event);
            } catch (Exception e) {
                event.setAttempts(event.getAttempts() + 1);
                event.setLastError(e.getMessage());
                if (event.getAttempts() >= 10) {
                    event.setDeadAt(Instant.now());
                    log.error("outbox event {} to {} marked dead after {} attempts; retained for hourly requeue: {}",
                            event.getId(), event.getTopic(), event.getAttempts(), e.getMessage());
                } else {
                    log.warn("outbox publish failed for {} {}, will retry: {}", event.getTopic(), event.getId(), e.getMessage());
                }
                outboxEventRepository.save(event);
            }
        }
    }

    @Scheduled(fixedDelayString = "${memorization.outbox-requeue-ms:3600000}", initialDelayString = "${memorization.outbox-requeue-ms:3600000}")
    @Transactional
    public void requeueDead() {
        List<OutboxEvent> dead = outboxEventRepository.findByDeadAtIsNotNull();
        for (OutboxEvent event : dead) {
            event.setDeadAt(null);
            event.setAttempts(0);
            outboxEventRepository.save(event);
        }
        if (!dead.isEmpty()) {
            log.info("requeued {} dead outbox events for another round of publishing", dead.size());
        }
    }
}
