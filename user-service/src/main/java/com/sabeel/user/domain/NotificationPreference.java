package com.sabeel.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "notification_preferences")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreference {
    @Id
    private UUID userId;

    @Column(nullable = false)
    private boolean pushEnabled;

    @Column(nullable = false)
    private boolean emailEnabled;

    private LocalTime memorizationReminderTime;
    private LocalTime revisionReminderTime;

    @Column(nullable = false)
    private boolean prayerReminders;

    @Column(nullable = false)
    private boolean azkarReminders;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean revisionReminders;
}
