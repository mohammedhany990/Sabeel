package com.sabeel.revision.controller;

import com.sabeel.revision.dto.*;
import com.sabeel.revision.service.RevisionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/revision")
@RequiredArgsConstructor
@Tag(name = "Revision")
public class RevisionController {
    private final RevisionService revisionService;

    @GetMapping("/due")
    @Operation(summary = "Revision items due today")
    public List<RevisionItemResponse> due(Authentication auth) {
        return revisionService.due(userId(auth));
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Upcoming revisions in the next N days")
    public List<RevisionItemResponse> upcoming(Authentication auth, @RequestParam(defaultValue = "7") int days) {
        return revisionService.upcoming(userId(auth), days);
    }

    @PostMapping("/items/{id}/review")
    @Operation(summary = "Record a revision review with accuracy; returns the next interval")
    public ReviewResponse review(Authentication auth, @PathVariable UUID id, @Valid @RequestBody ReviewRequest request) {
        return revisionService.review(userId(auth), id, request.accuracy(), request.mistakesCount());
    }

    @GetMapping("/stats")
    @Operation(summary = "Revision statistics")
    public RevisionStatsResponse stats(Authentication auth) {
        return revisionService.stats(userId(auth));
    }

    private UUID userId(Authentication auth) {
        return UUID.fromString(auth.getName());
    }
}
