package com.sabeel.recitation.repository;

import com.sabeel.recitation.domain.EvaluationJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EvaluationJobRepository extends JpaRepository<EvaluationJob, UUID> {
    List<EvaluationJob> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
