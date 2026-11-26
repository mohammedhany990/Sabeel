package com.sabeel.user.controller;

import com.sabeel.user.dto.*;
import com.sabeel.user.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users")
public class UserController {
    private final ProfileService profileService;

    @GetMapping("/me")
    @Operation(summary = "Get my profile")
    public ProfileResponse me(Authentication authentication) {
        return profileService.get(userId(authentication));
    }

    @PutMapping("/me")
    @Operation(summary = "Update my profile")
    public ProfileResponse update(Authentication authentication, @Valid @RequestBody UpdateProfileRequest request) {
        return profileService.update(userId(authentication), request);
    }

    @GetMapping("/me/preferences")
    @Operation(summary = "Get my notification preferences")
    public PreferencesResponse preferences(Authentication authentication) {
        return profileService.getPreferences(userId(authentication));
    }

    @PutMapping("/me/preferences")
    @Operation(summary = "Update my notification preferences")
    public PreferencesResponse updatePreferences(Authentication authentication, @RequestBody PreferencesRequest request) {
        return profileService.updatePreferences(userId(authentication), request);
    }

    @PostMapping("/me/device-tokens")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register an FCM device token for push notifications")
    public void registerDeviceToken(Authentication authentication, @Valid @RequestBody DeviceTokenRequest request) {
        profileService.registerDeviceToken(userId(authentication), request);
    }

    @DeleteMapping("/me/device-tokens/{tokenId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a device token")
    public void removeDeviceToken(Authentication authentication, @PathVariable UUID tokenId) {
        profileService.removeDeviceToken(userId(authentication), tokenId);
    }

    private UUID userId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
