package com.sabeel.memorization.service;

import com.sabeel.memorization.domain.*;
import com.sabeel.memorization.dto.*;
import com.sabeel.memorization.engine.AyahRange;
import com.sabeel.memorization.engine.PlanCalculator;
import com.sabeel.memorization.engine.QuranMeta;
import com.sabeel.memorization.event.OutboxService;
import com.sabeel.memorization.exception.ApiException;
import com.sabeel.memorization.repository.DailyTaskRepository;
import com.sabeel.memorization.repository.MemorizationPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.sabeel.memorization.config.KafkaConfig.TOPIC_PLAN_COMPLETED;
import static com.sabeel.memorization.config.KafkaConfig.TOPIC_TASK_COMPLETED;

@Service
@RequiredArgsConstructor
public class PlanService {
    private final MemorizationPlanRepository planRepository;
    private final DailyTaskRepository taskRepository;
    private final OutboxService outboxService;

    @Transactional
    public PlanResponse createPlan(UUID userId, CreatePlanRequest request) {
        int targetSurah = request.targetSurahId() == null ? QuranMeta.TOTAL_SURAHS : request.targetSurahId();
        if (request.startingSurahId() > targetSurah) {
            throw ApiException.badRequest("starting surah must be before target surah");
        }
        if (request.startingAyah() > QuranMeta.ayahsInSurah(request.startingSurahId())) {
            throw ApiException.badRequest("starting ayah out of range for surah");
        }
        LocalDate startDate = LocalDate.now();
        int dailyTarget = PlanCalculator.dailyTarget(request.startingSurahId(), request.startingAyah(), targetSurah,
                startDate, request.targetDate());

        MemorizationPlan plan = planRepository.save(MemorizationPlan.builder()
                .userId(userId)
                .startingSurahId(request.startingSurahId())
                .startingAyah(request.startingAyah())
                .targetSurahId(targetSurah)
                .startDate(startDate)
                .targetDate(request.targetDate())
                .dailyAyahTarget(dailyTarget)
                .status(PlanStatus.ACTIVE)
                .currentSurahId(request.startingSurahId())
                .currentAyah(request.startingAyah())
                .build());

        DailyTask firstTask = generateTaskForDate(plan, startDate);
        if (firstTask != null) {
            publishTaskCreated(firstTask);
        }
        return toResponse(plan);
    }

    @Transactional(readOnly = true)
    public List<PlanResponse> myPlans(UUID userId) {
        return planRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public PlanResponse changeStatus(UUID userId, UUID planId, PlanStatus status) {
        MemorizationPlan plan = planRepository.findByIdAndUserId(planId, userId)
                .orElseThrow(() -> ApiException.notFound("plan not found"));
        if (plan.getStatus() == PlanStatus.COMPLETED) {
            throw ApiException.badRequest("completed plan cannot change status");
        }
        plan.setStatus(status);
        return toResponse(planRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> todayTasks(UUID userId) {
        return taskRepository.findByUserIdAndTaskDateOrderByTaskType(userId, LocalDate.now()).stream()
                .map(this::toTaskResponse).toList();
    }

    @Transactional
    public TaskResponse completeTask(UUID userId, UUID taskId, double accuracy) {
        DailyTask task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> ApiException.notFound("task not found"));
        if (task.isCompleted()) {
            return toTaskResponse(task);
        }
        task.setCompleted(true);
        task.setCompletedAt(Instant.now());
        taskRepository.save(task);

        MemorizationPlan plan = task.getPlan();
        if (task.getTaskType() == TaskType.NEW) {
            int[] next = PlanCalculator.advance(task.getSurahId(), task.getFromAyah(), task.getToAyah() - task.getFromAyah() + 1, plan.getTargetSurahId());
            plan.setCurrentSurahId(next[0]);
            plan.setCurrentAyah(next[1]);
            if (next[0] > plan.getTargetSurahId()) {
                plan.setStatus(PlanStatus.COMPLETED);
                outboxService.record(TOPIC_PLAN_COMPLETED, plan.getUserId().toString(),
                        Map.of("userId", plan.getUserId().toString(), "planId", plan.getId().toString()));
            }
            planRepository.save(plan);
        }

        outboxService.record(TOPIC_TASK_COMPLETED, userId.toString(), Map.of(
                "userId", userId.toString(),
                "taskId", task.getId().toString(),
                "planId", plan.getId().toString(),
                "surahId", task.getSurahId(),
                "fromAyah", task.getFromAyah(),
                "toAyah", task.getToAyah(),
                "accuracy", accuracy,
                "completedAt", task.getCompletedAt().toString()));

        return toTaskResponse(task);
    }

    @Transactional(readOnly = true)
    public ProgressResponse progress(UUID userId, UUID planId) {
        MemorizationPlan plan = planRepository.findByIdAndUserId(planId, userId)
                .orElseThrow(() -> ApiException.notFound("plan not found"));
        int total = QuranMeta.remainingAyahs(plan.getStartingSurahId(), plan.getStartingAyah(), plan.getTargetSurahId());
        long done = taskRepository.memorizedAyahs(plan);
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(), plan.getTargetDate()));
        return new ProgressResponse(plan.getId(), plan.getStatus().name(), total, done,
                total == 0 ? 100.0 : Math.round(done * 10000.0 / total) / 100.0,
                plan.getCurrentSurahId(), plan.getCurrentAyah(), plan.getDailyAyahTarget(), daysRemaining);
    }

    @Transactional
    public DailyTask generateTaskForDate(MemorizationPlan plan, LocalDate date) {
        if (plan.getStatus() != PlanStatus.ACTIVE) {
            return null;
        }
        if (plan.getCurrentSurahId() > plan.getTargetSurahId()) {
            return null;
        }
        if (taskRepository.existsByPlanAndTaskDateAndTaskType(plan, date, TaskType.NEW)) {
            return null;
        }
        AyahRange range = PlanCalculator.nextRange(plan.getCurrentSurahId(), plan.getCurrentAyah(), plan.getDailyAyahTarget());
        return taskRepository.save(DailyTask.builder()
                .plan(plan)
                .userId(plan.getUserId())
                .taskDate(date)
                .surahId(range.surahId())
                .fromAyah(range.fromAyah())
                .toAyah(range.toAyah())
                .taskType(TaskType.NEW)
                .completed(false)
                .build());
    }

    public void publishTaskCreated(DailyTask task) {
        outboxService.record(com.sabeel.memorization.config.KafkaConfig.TOPIC_TASK_CREATED,
                task.getUserId().toString(), Map.of(
                        "userId", task.getUserId().toString(),
                        "taskId", task.getId().toString(),
                        "date", task.getTaskDate().toString(),
                        "surahId", task.getSurahId(),
                        "fromAyah", task.getFromAyah(),
                        "toAyah", task.getToAyah()));
    }

    private PlanResponse toResponse(MemorizationPlan p) {
        return new PlanResponse(p.getId(), p.getStartingSurahId(), p.getStartingAyah(), p.getTargetSurahId(),
                p.getStartDate(), p.getTargetDate(), p.getDailyAyahTarget(), p.getDailyAyahTarget() * 7,
                p.getStatus().name(), p.getCurrentSurahId(), p.getCurrentAyah());
    }

    private TaskResponse toTaskResponse(DailyTask t) {
        return new TaskResponse(t.getId(), t.getTaskDate(), t.getSurahId(), t.getFromAyah(), t.getToAyah(),
                t.getTaskType().name(), t.isCompleted(), t.getCompletedAt());
    }
}
