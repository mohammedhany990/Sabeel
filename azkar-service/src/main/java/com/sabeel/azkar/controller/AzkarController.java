package com.sabeel.azkar.controller;

import com.sabeel.azkar.dto.*;
import com.sabeel.azkar.service.AzkarDateResolver;
import com.sabeel.azkar.service.AzkarService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/azkar")
@RequiredArgsConstructor
public class AzkarController {
    private final AzkarService azkarService;
    private final AzkarDateResolver dateResolver;

    @GetMapping("/categories")
    public List<CategoryResponse> categories() {
        return azkarService.categories();
    }

    @GetMapping("/categories/{code}/items")
    public List<ItemResponse> items(@PathVariable String code, @AuthenticationPrincipal String userId,
                                    @RequestParam(required = false) String tz) {
        UUID uid = userId == null ? null : UUID.fromString(userId);
        return azkarService.items(code, uid, dateResolver.today(uid, tz));
    }

    @GetMapping("/today")
    public List<TodayCategoryResponse> today(@AuthenticationPrincipal String userId,
                                             @RequestParam(required = false) String tz) {
        UUID uid = UUID.fromString(userId);
        return azkarService.today(uid, dateResolver.today(uid, tz));
    }

    @PostMapping("/items/{id}/progress")
    public ProgressResponse progress(@PathVariable Integer id, @AuthenticationPrincipal String userId,
                                     @RequestParam(required = false) String tz) {
        UUID uid = UUID.fromString(userId);
        return azkarService.progress(uid, id, dateResolver.today(uid, tz));
    }

    @GetMapping("/streaks")
    public List<StreakResponse> streaks(@AuthenticationPrincipal String userId) {
        return azkarService.streaks(UUID.fromString(userId));
    }
}
