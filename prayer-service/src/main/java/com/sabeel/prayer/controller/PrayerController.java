package com.sabeel.prayer.controller;

import com.sabeel.prayer.dto.*;
import com.sabeel.prayer.service.PrayerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/prayer")
@RequiredArgsConstructor
public class PrayerController {
    private final PrayerService prayerService;

    @GetMapping("/times")
    public PrayerTimesResponse times(@AuthenticationPrincipal String userId,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                     @RequestParam(required = false) Double lat,
                                     @RequestParam(required = false) Double lng,
                                     @RequestParam(required = false) String method) {
        return prayerService.times(userId == null ? null : UUID.fromString(userId),
                date == null ? LocalDate.now() : date, lat, lng, method);
    }

    @GetMapping("/times/month")
    public List<PrayerTimesResponse> month(@AuthenticationPrincipal String userId,
                                           @RequestParam int year,
                                           @RequestParam int month,
                                           @RequestParam(required = false) Double lat,
                                           @RequestParam(required = false) Double lng,
                                           @RequestParam(required = false) String method) {
        return prayerService.month(userId == null ? null : UUID.fromString(userId), year, month, lat, lng, method);
    }

    @GetMapping("/qibla")
    public QiblaResponse qibla(@RequestParam double lat, @RequestParam double lng) {
        return prayerService.qibla(lat, lng);
    }

    @GetMapping("/hijri")
    public HijriResponse hijri(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return prayerService.hijri(date == null ? LocalDate.now() : date);
    }

    @GetMapping("/settings")
    public SettingsResponse settings(@AuthenticationPrincipal String userId) {
        return prayerService.settings(UUID.fromString(userId));
    }

    @PutMapping("/settings")
    public SettingsResponse saveSettings(@AuthenticationPrincipal String userId,
                                         @Valid @RequestBody SettingsRequest request) {
        return prayerService.saveSettings(UUID.fromString(userId), request);
    }
}
