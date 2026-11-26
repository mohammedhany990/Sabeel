package com.sabeel.azkar.service;

import com.sabeel.azkar.domain.UserMirror;
import com.sabeel.azkar.exception.ApiException;
import com.sabeel.azkar.repository.UserMirrorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AzkarDateResolver {
    private final UserMirrorRepository userMirrorRepository;

    public LocalDate today(UUID userId, String timezoneParam) {
        return LocalDate.now(resolveZone(userId, timezoneParam));
    }

    public ZoneId resolveZone(UUID userId, String timezoneParam) {
        if (timezoneParam != null && !timezoneParam.isBlank()) {
            try {
                return ZoneId.of(timezoneParam.trim());
            } catch (Exception e) {
                throw ApiException.badRequest("unknown timezone '" + timezoneParam + "'");
            }
        }
        if (userId != null) {
            String mirrored = userMirrorRepository.findById(userId).map(UserMirror::getTimezone).orElse(null);
            if (mirrored != null && !mirrored.isBlank()) {
                try {
                    return ZoneId.of(mirrored);
                } catch (Exception ignored) {
                }
            }
        }
        return ZoneId.of("UTC");
    }
}
