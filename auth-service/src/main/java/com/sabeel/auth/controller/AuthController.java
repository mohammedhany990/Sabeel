package com.sabeel.auth.controller;

import com.sabeel.auth.dto.*;
import com.sabeel.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new user")
    public UserResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @GetMapping("/verify-email")
    @Operation(summary = "Verify email address with the token sent by email")
    public MessageResponse verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return new MessageResponse("email verified");
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public TokenResponse login(@Valid @RequestBody LoginRequest request,
                               @RequestHeader(value = "User-Agent", required = false) String deviceInfo) {
        return authService.login(request, deviceInfo);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate refresh token and get a new access token")
    public TokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request,
                                 @RequestHeader(value = "User-Agent", required = false) String deviceInfo) {
        return authService.refresh(request.refreshToken(), deviceInfo);
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke the presented refresh token")
    public MessageResponse logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.refreshToken());
        return new MessageResponse("logged out");
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset token by email")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
        return new MessageResponse("if the email exists, a reset link was sent");
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with the token from the email")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
        return new MessageResponse("password updated");
    }

    @GetMapping("/me")
    @Operation(summary = "Current authenticated user")
    public UserResponse me(Authentication authentication) {
        return authService.me(UUID.fromString(authentication.getName()));
    }
}
