package com.sabeel.recitation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtSecretGuardTest {
    private static final String STRONG = "k3J9xQ2mV7rT5yB8nL1pW4zD6hF0aS3uE9cG2tY7";

    @Test
    void refusesTheDefaultAndDevSecretsOutsideDevMode() {
        assertThrows(IllegalStateException.class, () -> JwtSecretGuard.check("change-me-to-a-very-long-base64-secret-of-at-least-32-bytes", false));
        assertThrows(IllegalStateException.class, () -> JwtSecretGuard.check("dev-only-secret-change-me-0123456789abcdef", false));
    }

    @Test
    void refusesMissingOrShortSecrets() {
        assertThrows(IllegalStateException.class, () -> JwtSecretGuard.check(null, false));
        assertThrows(IllegalStateException.class, () -> JwtSecretGuard.check("  ", false));
        assertThrows(IllegalStateException.class, () -> JwtSecretGuard.check("short", false));
    }

    @Test
    void devModeAllowsTheDefaultSecret() {
        assertDoesNotThrow(() -> JwtSecretGuard.check("dev-only-secret-change-me-0123456789abcdef", true));
        assertDoesNotThrow(() -> JwtSecretGuard.check("change-me-to-a-very-long-base64-secret-of-at-least-32-bytes", true));
    }

    @Test
    void acceptsAStrongSecretInAnyMode() {
        assertDoesNotThrow(() -> JwtSecretGuard.check(STRONG, false));
        assertDoesNotThrow(() -> JwtSecretGuard.check(STRONG, true));
    }
}
