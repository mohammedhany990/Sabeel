package com.sabeel.community.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "circles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Circle {
    @Id
    private UUID id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false, unique = true, length = 12)
    private String inviteCode;

    @Column(nullable = false)
    private UUID ownerUserId;

    @Column(nullable = false)
    private Instant createdAt;
}
