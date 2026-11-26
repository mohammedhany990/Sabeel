package com.sabeel.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(min = 2, max = 120) String name,
        @Size(max = 500) String profileImageUrl,
        @Size(max = 2) String country,
        @Size(max = 50) String timezone,
        Integer preferredReciterId,
        @Pattern(regexp = "en|ar") String preferredLanguage) {
}
