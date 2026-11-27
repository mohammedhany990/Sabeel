package com.sabeel.auth;

import com.sabeel.auth.controller.AuthController;
import com.sabeel.auth.dto.ForgotPasswordRequest;
import com.sabeel.auth.dto.MessageResponse;
import com.sabeel.auth.service.AuthService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ForgotPasswordTest {
    private static final String GENERIC = "if the email exists, a reset link was sent";

    @Test
    void sameResponseWhenProcessingSucceeds() {
        AuthService service = mock(AuthService.class);
        AuthController controller = new AuthController(service);
        MessageResponse response = controller.forgotPassword(new ForgotPasswordRequest(" Someone@Example.com "));
        assertEquals(GENERIC, response.message());
        verify(service).forgotPassword("Someone@Example.com");
    }

    @Test
    void sameResponseWhenProcessingFails() {
        AuthService service = mock(AuthService.class);
        doThrow(new IllegalStateException("broker down")).when(service).forgotPassword(any());
        AuthController controller = new AuthController(service);
        MessageResponse response = controller.forgotPassword(new ForgotPasswordRequest("someone@example.com"));
        assertEquals(GENERIC, response.message());
    }
}
