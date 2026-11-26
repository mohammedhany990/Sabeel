package com.sabeel.azkar.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "user_azkar_logs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "azkarItemId", "logDate"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAzkarLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private Integer azkarItemId;

    @Column(nullable = false)
    private LocalDate logDate;

    @Column(nullable = false)
    private int count;
}
