package com.sabeel.community.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "user_stats", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "metric"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStat {
    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 40)
    private String metric;

    @Column(nullable = false)
    private long value;
}
