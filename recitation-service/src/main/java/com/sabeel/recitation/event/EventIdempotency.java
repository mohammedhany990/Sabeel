package com.sabeel.recitation.event;

import com.sabeel.recitation.domain.ProcessedEvent;
import com.sabeel.recitation.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class EventIdempotency {
    private final ProcessedEventRepository processedEventRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean process(String eventId, String topic, Runnable work) {
        if (processedEventRepository.existsById(eventId)) {
            return false;
        }
        work.run();
        processedEventRepository.save(new ProcessedEvent(eventId, topic, Instant.now()));
        return true;
    }
}
