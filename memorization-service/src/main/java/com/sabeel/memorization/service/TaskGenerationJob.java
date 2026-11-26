package com.sabeel.memorization.service;

import com.sabeel.memorization.domain.DailyTask;
import com.sabeel.memorization.domain.MemorizationPlan;
import com.sabeel.memorization.domain.PlanStatus;
import com.sabeel.memorization.domain.TaskType;
import com.sabeel.memorization.repository.DailyTaskRepository;
import com.sabeel.memorization.repository.MemorizationPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class TaskGenerationJob {
    private final MemorizationPlanRepository planRepository;
    private final DailyTaskRepository taskRepository;
    private final PlanService planService;

    @Scheduled(cron = "${memorization.task-generation-cron:0 0 1 * * *}")
    @Transactional
    public void generateTomorrowTasks() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        LocalDate today = LocalDate.now();
        for (MemorizationPlan plan : planRepository.findByStatus(PlanStatus.ACTIVE)) {
            for (DailyTask overdue : taskRepository.findByPlanAndTaskDateBeforeAndCompletedFalse(plan, tomorrow)) {
                if (!taskRepository.existsByPlanAndTaskDateAndTaskType(plan, today, TaskType.CARRYOVER)) {
                    taskRepository.save(DailyTask.builder()
                            .plan(plan)
                            .userId(plan.getUserId())
                            .taskDate(today)
                            .surahId(overdue.getSurahId())
                            .fromAyah(overdue.getFromAyah())
                            .toAyah(overdue.getToAyah())
                            .taskType(TaskType.CARRYOVER)
                            .completed(false)
                            .build());
                }
            }
            DailyTask created = planService.generateTaskForDate(plan, tomorrow);
            if (created != null) {
                planService.publishTaskCreated(created);
            }
        }
        log.info("task generation finished for {}", tomorrow);
    }
}
