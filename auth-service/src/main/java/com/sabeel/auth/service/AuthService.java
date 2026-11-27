package com.sabeel.auth.service;

import com.sabeel.auth.domain.RefreshToken;
import com.sabeel.auth.domain.Role;
import com.sabeel.auth.domain.User;
import com.sabeel.auth.domain.VerificationToken;
import com.sabeel.auth.dto.*;
import com.sabeel.auth.event.OutboxService;
import com.sabeel.auth.exception.ApiException;
import com.sabeel.auth.repository.RefreshTokenRepository;
import com.sabeel.auth.repository.UserRepository;
import com.sabeel.auth.repository.VerificationTokenRepository;
import com.sabeel.auth.config.KafkaTopics;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OutboxService outboxService;

    @Value("${jwt.refresh-ttl-days:30}")
    private long refreshTtlDays;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw ApiException.conflict("email already registered");
        }
        User user = User.builder()
                .email(request.email().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .name(request.name())
                .role(Role.USER)
                .emailVerified(false)
                .enabled(true)
                .build();
        user = userRepository.save(user);

        String verificationToken = newOpaqueToken();
        verificationTokenRepository.save(VerificationToken.builder()
                .user(user)
                .tokenHash(sha256(verificationToken))
                .type(VerificationToken.TokenType.EMAIL_VERIFY)
                .expiresAt(Instant.now().plus(Duration.ofHours(24)))
                .used(false)
                .build());

        outboxService.record(KafkaTopics.TOPIC_USER_REGISTERED, user.getId().toString(),
                Map.of("userId", user.getId().toString(), "email", user.getEmail(),
                        "name", user.getName(), "verificationToken", verificationToken,
                        "language", "ar".equals(request.language()) ? "ar" : "en"));

        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole().name(), user.isEmailVerified());
    }

    @Transactional
    public void verifyEmail(String token) {
        VerificationToken vt = verificationTokenRepository
                .findByTokenHashAndType(sha256(token), VerificationToken.TokenType.EMAIL_VERIFY)
                .orElseThrow(() -> ApiException.badRequest("invalid verification token"));
        if (vt.isUsed() || vt.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("verification token expired or already used");
        }
        vt.setUsed(true);
        User user = vt.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        verificationTokenRepository.save(vt);
    }

    @Transactional
    public TokenResponse login(LoginRequest request, String deviceInfo) {
        User user = userRepository.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> ApiException.unauthorized("invalid credentials"));
        if (!user.isEnabled() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("invalid credentials");
        }
        return issueTokens(user, deviceInfo);
    }

    @Transactional
    public TokenResponse refresh(String presentedToken, String deviceInfo) {
        RefreshToken stored = refreshTokenRepository.findByTokenHash(sha256(presentedToken))
                .orElseThrow(() -> ApiException.unauthorized("invalid refresh token"));
        if (stored.isRevoked()) {
            refreshTokenRepository.revokeAllForUser(stored.getUser());
            throw ApiException.unauthorized("refresh token reuse detected; all sessions revoked");
        }
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.unauthorized("refresh token expired");
        }
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        return issueTokens(stored.getUser(), deviceInfo);
    }

    @Transactional
    public void logout(String presentedToken) {
        refreshTokenRepository.findByTokenHash(sha256(presentedToken)).ifPresent(t -> {
            t.setRevoked(true);
            refreshTokenRepository.save(t);
        });
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmail(email.toLowerCase()).ifPresent(user -> {
            String resetToken = newOpaqueToken();
            verificationTokenRepository.save(VerificationToken.builder()
                    .user(user)
                    .tokenHash(sha256(resetToken))
                    .type(VerificationToken.TokenType.PASSWORD_RESET)
                    .expiresAt(Instant.now().plus(Duration.ofMinutes(30)))
                    .used(false)
                    .build());
            outboxService.record(KafkaTopics.TOPIC_PASSWORD_RESET, user.getId().toString(),
                    Map.of("userId", user.getId().toString(), "email", user.getEmail(), "resetToken", resetToken));
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        VerificationToken vt = verificationTokenRepository
                .findByTokenHashAndType(sha256(token), VerificationToken.TokenType.PASSWORD_RESET)
                .orElseThrow(() -> ApiException.badRequest("invalid reset token"));
        if (vt.isUsed() || vt.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("reset token expired or already used");
        }
        vt.setUsed(true);
        User user = vt.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        verificationTokenRepository.save(vt);
        refreshTokenRepository.revokeAllForUser(user);
    }

    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword, String keepRefreshToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("user not found"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw ApiException.badRequest("current password is incorrect");
        }
        if (currentPassword.equals(newPassword)) {
            throw ApiException.badRequest("new password must differ from the current password");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        if (keepRefreshToken == null || keepRefreshToken.isBlank()) {
            refreshTokenRepository.revokeAllForUser(user);
        } else {
            refreshTokenRepository.revokeAllForUserExcept(user, sha256(keepRefreshToken));
        }
    }

    @Transactional(readOnly = true)
    public UserResponse me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("user not found"));
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole().name(), user.isEmailVerified());
    }

    private TokenResponse issueTokens(User user, String deviceInfo) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshValue = newOpaqueToken();
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(sha256(refreshValue))
                .deviceInfo(deviceInfo)
                .expiresAt(Instant.now().plus(Duration.ofDays(refreshTtlDays)))
                .revoked(false)
                .createdAt(Instant.now())
                .build());
        return new TokenResponse(accessToken, refreshValue, "Bearer", jwtService.getAccessTtlSeconds());
    }

    private String newOpaqueToken() {
        return UUID.randomUUID() + "." + UUID.randomUUID();
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
