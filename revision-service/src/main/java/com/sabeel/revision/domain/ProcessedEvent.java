package com.sabeel.revision.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "processed_events")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessedEvent {
    @Id
    private String eventId;

    @Column(nullable = false)
    private String topic;

    @Column(nullable = false)
    private Instant processedAt;
}
