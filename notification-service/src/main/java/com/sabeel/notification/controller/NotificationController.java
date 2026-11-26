package com.sabeel.notification.controller;

import com.sabeel.notification.dto.NotificationResponse;
import com.sabeel.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping("/me")
    @Operation(summary = "My notifications, newest first")
    public List<NotificationResponse> mine(Authentication auth) {
        return notificationService.myNotifications(UUID.fromString(auth.getName()));
    }

    @PostMapping("/me/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public void markRead(Authentication auth, @PathVariable UUID id) {
        notificationService.markRead(UUID.fromString(auth.getName()), id);
    }
}
