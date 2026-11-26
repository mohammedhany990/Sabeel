package com.sabeel.prayer.domain;

import com.sabeel.prayer.engine.CalculationMethod;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "prayer_settings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrayerSettings {
    @Id
    private UUID userId;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CalculationMethod method;

    @Column(nullable = false)
    private String timezone;

    @Column(nullable = false)
    private int asrFactor;
}
