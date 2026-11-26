package com.sabeel.gateway;

import com.sabeel.gateway.security.JwtAuthGlobalFilter;
import com.sabeel.gateway.security.JwtService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthGlobalFilterTest {
    private JwtService jwtService;
    private JwtAuthGlobalFilter filter;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtService.class);
        filter = new JwtAuthGlobalFilter(jwtService);
    }

    private AtomicReference<ServerWebExchange> run(MockServerHttpRequest.BaseBuilder<?> request) {
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        AtomicReference<ServerWebExchange> captured = new AtomicReference<>();
        filter.filter(exchange, e -> {
            captured.set(e);
            return Mono.empty();
        }).block();
        return captured;
    }

    @Test
    void stripsSpoofedIdentityHeadersOnPublicPaths() {
        AtomicReference<ServerWebExchange> captured = run(MockServerHttpRequest
                .get("/api/v1/quran/surahs")
                .header("X-User-Id", "attacker-id")
                .header("X-User-Role", "ADMIN"));
        assertNotNull(captured.get());
        assertNull(captured.get().getRequest().getHeaders().getFirst("X-User-Id"));
        assertNull(captured.get().getRequest().getHeaders().getFirst("X-User-Role"));
    }

    @Test
    void identityComesFromTheJwtNotFromInboundHeaders() {
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn("real-user-id");
        when(claims.get("role", String.class)).thenReturn("USER");
        when(jwtService.parse("good-token")).thenReturn(claims);
        AtomicReference<ServerWebExchange> captured = run(MockServerHttpRequest
                .get("/api/v1/users/me")
                .header("Authorization", "Bearer good-token")
                .header("X-User-Id", "attacker-id")
                .header("X-User-Role", "ADMIN"));
        assertNotNull(captured.get());
        assertEquals("real-user-id", captured.get().getRequest().getHeaders().getFirst("X-User-Id"));
        assertEquals("USER", captured.get().getRequest().getHeaders().getFirst("X-User-Role"));
    }

    @Test
    void protectedPathWithoutTokenIsRejected() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/v1/users/me")
                .header("X-User-Id", "attacker-id"));
        AtomicReference<ServerWebExchange> captured = new AtomicReference<>();
        filter.filter(exchange, e -> {
            captured.set(e);
            return Mono.empty();
        }).block();
        assertNull(captured.get());
        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }

    private MockServerWebExchange rejected(String acceptLanguage) {
        MockServerHttpRequest.BaseBuilder<?> request = MockServerHttpRequest.get("/api/v1/users/me");
        if (acceptLanguage != null) {
            request.header("Accept-Language", acceptLanguage);
        }
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        filter.filter(exchange, e -> Mono.empty()).block();
        return exchange;
    }

    @Test
    void rejectionIsArabicWhenArabicIsPreferred() {
        MockServerWebExchange exchange = rejected("ar-EG,ar;q=0.9,en;q=0.5");
        assertEquals("ar", exchange.getResponse().getHeaders().getFirst("Content-Language"));
        String body = exchange.getResponse().getBodyAsString().block();
        assertTrue(body.contains("رمز الدخول مفقود"), body);
        assertTrue(body.contains("غير مصرّح"), body);
    }

    @Test
    void rejectionStaysEnglishByDefaultAndWhenEnglishComesFirst() {
        for (String header : new String[]{null, "en-US,en;q=0.9,ar;q=0.5", "fr"}) {
            MockServerWebExchange exchange = rejected(header);
            assertEquals("en", exchange.getResponse().getHeaders().getFirst("Content-Language"));
            String body = exchange.getResponse().getBodyAsString().block();
            assertTrue(body.contains("missing bearer token"), body);
            assertTrue(body.contains("Unauthorized"), body);
        }
    }

    @Test
    void invalidTokenRejectionIsLocalised() {
        when(jwtService.parse("bad")).thenThrow(new RuntimeException("bad"));
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/users/me")
                .header("Authorization", "Bearer bad").header("Accept-Language", "ar"));
        filter.filter(exchange, e -> Mono.empty()).block();
        assertTrue(exchange.getResponse().getBodyAsString().block().contains("الرمز غير صالح أو منتهي الصلاحية"));
    }
}
