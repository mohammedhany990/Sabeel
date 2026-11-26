package com.sabeel.recitation.controller;

import com.sabeel.recitation.dto.EvaluationRequest;
import com.sabeel.recitation.dto.EvaluationResponse;
import com.sabeel.recitation.service.RecitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recitation")
@RequiredArgsConstructor
public class RecitationController {
    private final RecitationService recitationService;

    @PostMapping("/evaluations")
    public EvaluationResponse request(@AuthenticationPrincipal String userId,
                                      @Valid @RequestBody EvaluationRequest request) {
        return EvaluationResponse.of(recitationService.requestEvaluation(UUID.fromString(userId),
                request.surahId(), request.fromAyah(), request.toAyah(),
                request.audioObjectKey(), request.audioUrl(), request.transcript(), request.expectedText()));
    }

    @GetMapping("/evaluations")
    public List<EvaluationResponse> myEvaluations(@AuthenticationPrincipal String userId) {
        return recitationService.myJobs(UUID.fromString(userId)).stream()
                .map(EvaluationResponse::of).toList();
    }

    @GetMapping("/evaluations/{id}")
    public EvaluationResponse get(@AuthenticationPrincipal String userId, @PathVariable UUID id) {
        return EvaluationResponse.of(recitationService.getOwned(UUID.fromString(userId), id));
    }
}
