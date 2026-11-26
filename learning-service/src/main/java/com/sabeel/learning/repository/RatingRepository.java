package com.sabeel.learning.repository;

import com.sabeel.learning.domain.Rating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RatingRepository extends JpaRepository<Rating, UUID> {
    Optional<Rating> findByUserIdAndCourseId(UUID userId, String courseId);
    List<Rating> findByCourseId(String courseId);
}
