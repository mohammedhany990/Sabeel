package com.sabeel.notification.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "user_mirror")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserMirror {
    @Id
    private UUID userId;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private boolean pushEnabled;

    @Column(nullable = false)
    private boolean emailEnabled;

    private LocalTime memorizationReminderTime;
    private LocalTime revisionReminderTime;

    @Column(nullable = false)
    private boolean prayerRemindersEnabled;

    @Column(nullable = false)
    private boolean azkarRemindersEnabled;

    @Column(nullable = false)
    private String timezone;
}
