package com.sabeel.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DeviceTokenRequest(
        @NotBlank @Size(max = 500) String fcmToken,
        @NotBlank @Pattern(regexp = "ANDROID|IOS|WEB") String platform) {
}
