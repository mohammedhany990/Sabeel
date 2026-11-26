package com.sabeel.memorization.controller;

import com.sabeel.memorization.domain.PlanStatus;
import com.sabeel.memorization.dto.*;
import com.sabeel.memorization.service.PlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/memorization")
@RequiredArgsConstructor
@Tag(name = "Memorization")
public class MemorizationController {
    private final PlanService planService;

    @PostMapping("/plans")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a memorization plan; the system computes the daily target")
    public PlanResponse createPlan(Authentication auth, @Valid @RequestBody CreatePlanRequest request) {
        return planService.createPlan(userId(auth), request);
    }

    @GetMapping("/plans/me")
    @Operation(summary = "List my plans")
    public List<PlanResponse> myPlans(Authentication auth) {
        return planService.myPlans(userId(auth));
    }

    @PatchMapping("/plans/{id}")
    @Operation(summary = "Pause, resume or cancel a plan")
    public PlanResponse changeStatus(Authentication auth, @PathVariable UUID id, @RequestParam PlanStatus status) {
        return planService.changeStatus(userId(auth), id, status);
    }

    @GetMapping("/tasks/today")
    @Operation(summary = "Today's memorization tasks")
    public List<TaskResponse> today(Authentication auth) {
        return planService.todayTasks(userId(auth));
    }

    @PostMapping("/tasks/{id}/complete")
    @Operation(summary = "Mark a task completed with self-assessed accuracy")
    public TaskResponse complete(Authentication auth, @PathVariable UUID id, @Valid @RequestBody CompleteTaskRequest request) {
        return planService.completeTask(userId(auth), id, request.accuracy());
    }

    @GetMapping("/plans/{id}/progress")
    @Operation(summary = "Progress rollup for a plan")
    public ProgressResponse progress(Authentication auth, @PathVariable UUID id) {
        return planService.progress(userId(auth), id);
    }

    private UUID userId(Authentication auth) {
        return UUID.fromString(auth.getName());
    }
}
