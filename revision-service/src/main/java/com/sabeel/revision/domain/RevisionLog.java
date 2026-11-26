package com.sabeel.revision.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "revision_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private RevisionItem item;

    @Column(nullable = false)
    private Instant reviewedAt;

    @Column(nullable = false)
    private double accuracy;

    @Column(nullable = false)
    private int mistakesCount;

    @Column(nullable = false)
    private int nextIntervalDays;
}
