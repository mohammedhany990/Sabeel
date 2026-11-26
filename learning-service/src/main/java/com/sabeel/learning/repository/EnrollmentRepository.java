package com.sabeel.learning.repository;

import com.sabeel.learning.domain.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    Optional<Enrollment> findByUserIdAndCourseId(UUID userId, String courseId);
    List<Enrollment> findByUserIdOrderByEnrolledAtDesc(UUID userId);
}
