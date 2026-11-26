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
}
