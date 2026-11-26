package com.sabeel.auth;

import com.sabeel.auth.domain.OutboxEvent;
import com.sabeel.auth.event.OutboxRelay;
import com.sabeel.auth.repository.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OutboxRelayTest {
    private OutboxEventRepository repository;
    private KafkaTemplate<String, String> kafkaTemplate;
    private OutboxRelay relay;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        repository = mock(OutboxEventRepository.class);
        kafkaTemplate = mock(KafkaTemplate.class);
        relay = new OutboxRelay(repository, kafkaTemplate);
    }

    private OutboxEvent pendingEvent(int attempts) {
        return OutboxEvent.builder()
                .topic("auth.user.registered").eventKey("u1").payload("{}")
                .occurredAt(Instant.now()).attempts(attempts).build();
    }

    @Test
    @SuppressWarnings("unchecked")
    void publishesPendingEventAndMarksItSent() {
        OutboxEvent event = pendingEvent(0);
        when(repository.findTop50ByPublishedAtIsNullAndDeadAtIsNullOrderByOccurredAt()).thenReturn(List.of(event));
        SendResult<String, String> result = mock(SendResult.class);
        when(kafkaTemplate.send(anyString(), anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(result));
        relay.publishPending();
        assertNotNull(event.getPublishedAt());
        assertNull(event.getDeadAt());
        verify(repository).save(event);
    }

    @Test
    void failedPublishKeepsEventUnpublishedAndCountsAttempts() {
        OutboxEvent event = pendingEvent(0);
        when(repository.findTop50ByPublishedAtIsNullAndDeadAtIsNullOrderByOccurredAt()).thenReturn(List.of(event));
        when(kafkaTemplate.send(anyString(), anyString(), anyString()))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("broker down")));
        relay.publishPending();
        assertNull(event.getPublishedAt());
        assertNull(event.getDeadAt());
        assertEquals(1, event.getAttempts());
        verify(repository).save(event);
    }

    @Test
    void tenthFailureMarksEventDeadButRetainsTheRecord() {
        OutboxEvent event = pendingEvent(9);
        when(repository.findTop50ByPublishedAtIsNullAndDeadAtIsNullOrderByOccurredAt()).thenReturn(List.of(event));
        when(kafkaTemplate.send(anyString(), anyString(), anyString()))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("broker down")));
        relay.publishPending();
        assertNull(event.getPublishedAt());
        assertNotNull(event.getDeadAt());
        assertEquals(10, event.getAttempts());
        verify(repository).save(event);
        verify(repository, never()).delete(any());
    }

    @Test
    void requeueDeadResetsDeadEventsForAnotherRound() {
        OutboxEvent event = pendingEvent(10);
        event.setDeadAt(Instant.now());
        when(repository.findByDeadAtIsNotNull()).thenReturn(List.of(event));
        relay.requeueDead();
        assertNull(event.getDeadAt());
        assertEquals(0, event.getAttempts());
        assertNull(event.getPublishedAt());
        verify(repository).save(event);
    }
}
