package com.sabeel.memorization.repository;

import com.sabeel.memorization.domain.MemorizationPlan;
import com.sabeel.memorization.domain.PlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemorizationPlanRepository extends JpaRepository<MemorizationPlan, UUID> {
    List<MemorizationPlan> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<MemorizationPlan> findByStatus(PlanStatus status);
    Optional<MemorizationPlan> findByIdAndUserId(UUID id, UUID userId);
}
