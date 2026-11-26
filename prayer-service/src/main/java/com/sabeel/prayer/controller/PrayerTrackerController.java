package com.sabeel.prayer.controller;

import com.sabeel.prayer.dto.PrayerLogRequest;
import com.sabeel.prayer.dto.PrayerTrackerResponse;
import com.sabeel.prayer.service.AdhanCatalog;
import com.sabeel.prayer.service.PrayerTrackerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/prayer")
@RequiredArgsConstructor
public class PrayerTrackerController {
    private final PrayerTrackerService tracker;
    private final AdhanCatalog adhanCatalog;

    @PutMapping("/log")
    public ResponseEntity<Void> log(@AuthenticationPrincipal String userId, @Valid @RequestBody PrayerLogRequest request) {
        tracker.log(UUID.fromString(userId), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/log")
    public PrayerTrackerResponse range(@AuthenticationPrincipal String userId,
                                       @RequestParam(required = false) String from,
                                       @RequestParam(required = false) String to) {
        return tracker.range(UUID.fromString(userId), from, to);
    }

    @GetMapping("/adhans")
    public List<AdhanCatalog.Adhan> adhans() {
        return adhanCatalog.adhans();
    }
}
