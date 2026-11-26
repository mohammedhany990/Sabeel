package com.sabeel.memorization.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "daily_tasks", uniqueConstraints = @UniqueConstraint(columnNames = {"planId", "taskDate", "taskType"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyTask {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private MemorizationPlan plan;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private LocalDate taskDate;

    @Column(nullable = false)
    private int surahId;

    @Column(nullable = false)
    private int fromAyah;

    @Column(nullable = false)
    private int toAyah;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskType taskType;

    @Column(nullable = false)
    private boolean completed;

    private Instant completedAt;
}
