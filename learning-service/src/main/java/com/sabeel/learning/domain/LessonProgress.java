package com.sabeel.learning.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lesson_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"enrollmentId", "lessonId"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonProgress {
    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID enrollmentId;

    @Column(nullable = false, length = 24)
    private String lessonId;

    @Column(nullable = false)
    private int watchedSeconds;

    @Column(nullable = false)
    private boolean completed;

    private Instant lastWatchedAt;
}
