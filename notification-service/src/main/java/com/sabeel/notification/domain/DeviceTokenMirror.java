package com.sabeel.notification.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "device_token_mirror")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceTokenMirror {
    @Id
    private String fcmToken;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 10)
    private String platform;

    @Column(nullable = false)
    private Instant lastSeenAt;
}
