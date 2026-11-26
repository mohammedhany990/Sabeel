package com.sabeel.azkar.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "azkar_streaks", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "categoryCode"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AzkarStreak {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 30)
    private String categoryCode;

    @Column(nullable = false)
    private int currentStreak;

    @Column(nullable = false)
    private int longestStreak;

    private LocalDate lastCompletedDate;
}
