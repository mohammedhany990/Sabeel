package com.sabeel.quran.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "khatmas", indexes = @Index(columnList = "userId"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Khatma {
    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate targetDate;

    @Column(nullable = false)
    private int currentPage;

    private LocalDate completedOn;
}
