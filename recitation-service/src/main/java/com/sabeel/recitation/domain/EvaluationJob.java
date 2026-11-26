package com.sabeel.recitation.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "evaluation_jobs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationJob {
    public enum Status { PENDING, RUNNING, COMPLETED, FAILED }

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private int surahId;

    @Column(nullable = false)
    private int fromAyah;

    @Column(nullable = false)
    private int toAyah;

    @Column(length = 300)
    private String audioObjectKey;

    @Column(length = 1000)
    private String audioUrl;

    @Column(columnDefinition = "text")
    private String transcript;

    @Column(nullable = false, columnDefinition = "text")
    private String expectedText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Status status;

    private Integer mistakeCount;

    private Double accuracy;

    @Column(columnDefinition = "text")
    private String mistakesJson;

    @Column(length = 500)
    private String error;

    @Column(length = 40)
    private String engineMode;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant completedAt;
}
