package com.sabeel.gateway.security;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthGlobalFilter implements GlobalFilter, Ordered {
    private static final List<String> PUBLIC_PREFIXES = List.of(
            "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh",
            "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password", "/api/v1/auth/verify-email",
            "/api/v1/quran/surahs", "/api/v1/quran/ayahs", "/api/v1/quran/pages",
            "/api/v1/quran/juz", "/api/v1/quran/search", "/api/v1/quran/reciters",
            "/v3/api-docs", "/swagger-ui");

    private final JwtService jwtService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        var cleanedRequest = exchange.getRequest().mutate()
                .headers(h -> {
                    h.remove("X-User-Id");
                    h.remove("X-User-Role");
                })
                .build();
        exchange = exchange.mutate().request(cleanedRequest).build();
        String path = exchange.getRequest().getPath().value();
        if (PUBLIC_PREFIXES.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }
        String header = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return unauthorized(exchange, localized(exchange, "missing bearer token", "رمز الدخول مفقود"));
        }
        try {
            Claims claims = jwtService.parse(header.substring(7));
            var mutated = exchange.mutate().request(exchange.getRequest().mutate()
                    .header("X-User-Id", claims.getSubject())
                    .header("X-User-Role", claims.get("role", String.class) == null ? "USER" : claims.get("role", String.class))
                    .build()).build();
            return chain.filter(mutated);
        } catch (Exception e) {
            return unauthorized(exchange, localized(exchange, "invalid or expired token", "الرمز غير صالح أو منتهي الصلاحية"));
        }
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String detail) {
        var response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_PROBLEM_JSON);
        boolean arabic = isArabic(exchange);
        response.getHeaders().set("Content-Language", arabic ? "ar" : "en");
        String body = "{\"type\":\"https://sabeel.app/errors/401\",\"title\":\"" + (arabic ? "غير مصرّح" : "Unauthorized")
                + "\",\"status\":401,\"detail\":\"" + detail + "\"}";
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8))));
    }

    private static boolean isArabic(ServerWebExchange exchange) {
        String header = exchange.getRequest().getHeaders().getFirst("Accept-Language");
        if (header == null) {
            return false;
        }
        for (String part : header.split(",")) {
            String tag = part.split(";")[0].trim().toLowerCase();
            if (tag.startsWith("ar")) {
                return true;
            }
            if (tag.startsWith("en")) {
                return false;
            }
        }
        return false;
    }

    private static String localized(ServerWebExchange exchange, String english, String arabic) {
        return isArabic(exchange) ? arabic : english;
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
