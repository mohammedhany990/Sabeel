package com.sabeel.auth;

import com.sabeel.auth.domain.User;
import com.sabeel.auth.dto.ChangePasswordRequest;
import com.sabeel.auth.event.OutboxService;
import com.sabeel.auth.exception.ApiException;
import com.sabeel.auth.repository.RefreshTokenRepository;
import com.sabeel.auth.repository.UserRepository;
import com.sabeel.auth.repository.VerificationTokenRepository;
import com.sabeel.auth.service.AuthService;
import com.sabeel.auth.service.JwtService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ChangePasswordTest {
    private UserRepository users;
    private RefreshTokenRepository refreshTokens;
    private PasswordEncoder encoder;
    private AuthService service;
    private User user;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        refreshTokens = mock(RefreshTokenRepository.class);
        encoder = mock(PasswordEncoder.class);
        user = User.builder().id(UUID.randomUUID()).email("omar@example.com").passwordHash("old-hash").build();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(encoder.matches("current-pass", "old-hash")).thenReturn(true);
        when(encoder.encode("brand-new-pass")).thenReturn("new-hash");
        service = new AuthService(users, refreshTokens, mock(VerificationTokenRepository.class),
                encoder, mock(JwtService.class), mock(OutboxService.class));
    }

    @Test
    void wrongCurrentPasswordIsRejectedAndNothingChanges() {
        ApiException e = assertThrows(ApiException.class,
                () -> service.changePassword(user.getId(), "wrong", "brand-new-pass", null));
        assertEquals("current password is incorrect", e.getMessage());
        assertEquals("old-hash", user.getPasswordHash());
        verify(users, never()).save(any());
        verifyNoInteractions(refreshTokens);
    }

    @Test
    void sameNewPasswordIsRejected() {
        ApiException e = assertThrows(ApiException.class,
                () -> service.changePassword(user.getId(), "current-pass", "current-pass", null));
        assertEquals("new password must differ from the current password", e.getMessage());
        verify(users, never()).save(any());
    }

    @Test
    void successUpdatesHashAndRevokesEverySessionWhenNoneIsKept() {
        service.changePassword(user.getId(), "current-pass", "brand-new-pass", null);
        assertEquals("new-hash", user.getPasswordHash());
        verify(users).save(user);
        verify(refreshTokens).revokeAllForUser(user);
        verify(refreshTokens, never()).revokeAllForUserExcept(any(), any());
    }

    @Test
    void successKeepsOnlyTheCurrentSession() {
        service.changePassword(user.getId(), "current-pass", "brand-new-pass", "some-refresh-token");
        verify(refreshTokens).revokeAllForUserExcept(eq(user), any());
        verify(refreshTokens, never()).revokeAllForUser(any());
    }

    @Test
    void newPasswordFollowsTheSignupLengthRules() {
        var validator = Validation.buildDefaultValidatorFactory().getValidator();
        assertFalse(validator.validate(new ChangePasswordRequest("current-pass", "short", null)).isEmpty());
        assertFalse(validator.validate(new ChangePasswordRequest("current-pass", "x".repeat(73), null)).isEmpty());
        assertFalse(validator.validate(new ChangePasswordRequest("", "brand-new-pass", null)).isEmpty());
        assertTrue(validator.validate(new ChangePasswordRequest("current-pass", "brand-new-pass", null)).isEmpty());
    }
}
