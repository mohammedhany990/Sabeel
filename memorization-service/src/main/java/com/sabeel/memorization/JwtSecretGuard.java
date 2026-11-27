package com.sabeel.memorization;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Component
public class JwtSecretGuard {
    private static final Logger log = LoggerFactory.getLogger(JwtSecretGuard.class);

    public JwtSecretGuard(@Value("${jwt.secret:}") String secret, @Value("${SABEEL_DEV_MODE:false}") boolean devMode) {
        check(secret, devMode);
    }

    static void check(String secret, boolean devMode) {
        if (!isInsecure(secret)) {
            return;
        }
        if (devMode) {
            log.warn("JWT_SECRET is a known development value. SABEEL_DEV_MODE=true allows it. Never use this outside local development.");
            return;
        }
        throw new IllegalStateException("Refusing to start: JWT_SECRET is missing, shorter than 32 bytes or a known default. "
                + "Set a long random JWT_SECRET, or set SABEEL_DEV_MODE=true for local development only.");
    }

    static boolean isInsecure(String secret) {
        if (secret == null || secret.isBlank()) {
            return true;
        }
        String lower = secret.toLowerCase(Locale.ROOT);
        return secret.getBytes(StandardCharsets.UTF_8).length < 32 || lower.contains("change-me") || lower.contains("dev-only");
    }
}
