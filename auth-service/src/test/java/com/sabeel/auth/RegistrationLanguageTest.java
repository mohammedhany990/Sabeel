package com.sabeel.auth;

import com.sabeel.auth.domain.User;
import com.sabeel.auth.dto.RegisterRequest;
import com.sabeel.auth.event.OutboxService;
import com.sabeel.auth.repository.RefreshTokenRepository;
import com.sabeel.auth.repository.UserRepository;
import com.sabeel.auth.repository.VerificationTokenRepository;
import com.sabeel.auth.service.AuthService;
import com.sabeel.auth.service.JwtService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class RegistrationLanguageTest {
    private OutboxService outboxService;
    private AuthService service;

    @BeforeEach
    void setUp() {
        UserRepository users = mock(UserRepository.class);
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(any())).thenReturn("hash");
        outboxService = mock(OutboxService.class);
        service = new AuthService(users, mock(RefreshTokenRepository.class), mock(VerificationTokenRepository.class),
                encoder, mock(JwtService.class), outboxService);
    }

    private Map<?, ?> registeredPayload(String language) {
        service.register(new RegisterRequest("omar@example.com", "password123", "Omar", language));
        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(outboxService).record(eq("auth.user.registered"), any(), payload.capture());
        return (Map<?, ?>) payload.getValue();
    }

    @Test
    void arabicLanguageIsCarriedInTheRegistrationEvent() {
        assertEquals("ar", registeredPayload("ar").get("language"));
    }

    @Test
    void missingLanguageDefaultsToEnglishInTheEvent() {
        assertEquals("en", registeredPayload(null).get("language"));
    }

    @Test
    void unsupportedLanguageIsRejectedByValidation() {
        var validator = Validation.buildDefaultValidatorFactory().getValidator();
        assertFalse(validator.validate(new RegisterRequest("omar@example.com", "password123", "Omar", "fr")).isEmpty());
        assertTrue(validator.validate(new RegisterRequest("omar@example.com", "password123", "Omar", "ar")).isEmpty());
        assertTrue(validator.validate(new RegisterRequest("omar@example.com", "password123", "Omar", null)).isEmpty());
    }
}
