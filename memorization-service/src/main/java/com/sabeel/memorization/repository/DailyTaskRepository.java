package com.sabeel.memorization.repository;

import com.sabeel.memorization.domain.DailyTask;
import com.sabeel.memorization.domain.MemorizationPlan;
import com.sabeel.memorization.domain.TaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DailyTaskRepository extends JpaRepository<DailyTask, UUID> {
    List<DailyTask> findByUserIdAndTaskDateOrderByTaskType(UUID userId, LocalDate taskDate);
    boolean existsByPlanAndTaskDateAndTaskType(MemorizationPlan plan, LocalDate taskDate, TaskType taskType);
    List<DailyTask> findByPlanAndTaskDateBeforeAndCompletedFalse(MemorizationPlan plan, LocalDate date);
    Optional<DailyTask> findByIdAndUserId(UUID id, UUID userId);

    @Query("select coalesce(sum(t.toAyah - t.fromAyah + 1), 0) from DailyTask t where t.plan = :plan and t.completed = true")
    long memorizedAyahs(MemorizationPlan plan);
}
