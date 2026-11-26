package com.sabeel.azkar.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
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

    @Column
    private String timezone;

    @Column(nullable = false)
    private Instant updatedAt;
}
