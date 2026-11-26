package com.sabeel.quran.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reading_state")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadingState {
    @Id
    private UUID userId;

    @Column(nullable = false)
    private int lastAyahId;

    @Column(nullable = false)
    private Instant lastReadAt;
}
