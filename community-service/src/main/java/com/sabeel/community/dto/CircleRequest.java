package com.sabeel.community.dto;

import jakarta.validation.constraints.NotBlank;

public record CircleRequest(@NotBlank String name, String description) {
}
