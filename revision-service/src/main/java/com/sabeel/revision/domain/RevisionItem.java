package com.sabeel.revision.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "revision_items", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "surahId", "fromAyah", "toAyah"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private int surahId;

    @Column(nullable = false)
    private int fromAyah;

    @Column(nullable = false)
    private int toAyah;

    @Column(nullable = false)
    private LocalDate memorizedAt;

    @Column(nullable = false)
    private int intervalDays;

    @Column(nullable = false)
    private double easeFactor;

    @Column(nullable = false)
    private int repetitions;

    @Column(nullable = false)
    private LocalDate nextRevisionDate;

    private Double lastAccuracy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Difficulty difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RevisionStatus status;
}
