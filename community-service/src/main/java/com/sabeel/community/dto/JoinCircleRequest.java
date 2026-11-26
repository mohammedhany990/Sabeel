package com.sabeel.community.dto;

import jakarta.validation.constraints.NotBlank;

public record JoinCircleRequest(@NotBlank String inviteCode) {
}
