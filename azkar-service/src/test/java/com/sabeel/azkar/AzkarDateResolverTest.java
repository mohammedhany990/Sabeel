package com.sabeel.azkar;

import com.sabeel.azkar.domain.UserMirror;
import com.sabeel.azkar.exception.ApiException;
import com.sabeel.azkar.repository.UserMirrorRepository;
import com.sabeel.azkar.service.AzkarDateResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AzkarDateResolverTest {
    private UserMirrorRepository userMirrorRepository;
    private AzkarDateResolver resolver;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        userMirrorRepository = mock(UserMirrorRepository.class);
        resolver = new AzkarDateResolver(userMirrorRepository);
    }

    @Test
    void explicitTimezoneParamWins() {
        assertEquals(ZoneId.of("Asia/Jakarta"), resolver.resolveZone(userId, "Asia/Jakarta"));
        verifyNoInteractions(userMirrorRepository);
    }

    @Test
    void invalidTimezoneParamIsABadRequest() {
        assertThrows(ApiException.class, () -> resolver.resolveZone(userId, "not-a-zone"));
    }

    @Test
    void mirrorTimezoneIsUsedWhenNoParam() {
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.of(
                UserMirror.builder().userId(userId).timezone("America/New_York").updatedAt(Instant.now()).build()));
        assertEquals(ZoneId.of("America/New_York"), resolver.resolveZone(userId, null));
    }

    @Test
    void utcIsTheFallbackWithoutMirror() {
        when(userMirrorRepository.findById(userId)).thenReturn(Optional.empty());
        assertEquals(ZoneId.of("UTC"), resolver.resolveZone(userId, null));
    }
}
