package com.sabeel.user.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "profiles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Profile {
    @Id
    private UUID userId;

    @Column(nullable = false)
    private String name;

    private String profileImageUrl;
    private String country;

    @Column(nullable = false)
    private String timezone;

    private Integer preferredReciterId;

    @Column(nullable = false, length = 5, columnDefinition = "varchar(5) default 'en'")
    private String preferredLanguage;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}
