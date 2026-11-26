package com.sabeel.learning.repository;

import com.sabeel.learning.domain.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {
    Optional<LessonProgress> findByEnrollmentIdAndLessonId(UUID enrollmentId, String lessonId);
    List<LessonProgress> findByEnrollmentId(UUID enrollmentId);
}
