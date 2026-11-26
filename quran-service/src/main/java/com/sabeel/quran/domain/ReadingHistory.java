package com.sabeel.quran.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reading_history", indexes = @Index(name = "idx_history_user", columnList = "userId, readAt"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadingHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private int ayahId;

    @Column(nullable = false)
    private Instant readAt;
}
