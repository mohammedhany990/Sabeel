package com.sabeel.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "device_tokens", indexes = @Index(name = "idx_device_fcm_token", columnList = "fcmToken", unique = true))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, unique = true, length = 500)
    private String fcmToken;

    @Column(nullable = false, length = 10)
    private String platform;

    @Column(nullable = false)
    private Instant lastSeenAt;
}
