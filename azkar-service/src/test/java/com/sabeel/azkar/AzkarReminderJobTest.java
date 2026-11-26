package com.sabeel.azkar;

import com.sabeel.azkar.domain.AzkarReminderDay;
import com.sabeel.azkar.domain.UserMirror;
import com.sabeel.azkar.event.OutboxService;
import com.sabeel.azkar.repository.AzkarReminderDayRepository;
import com.sabeel.azkar.repository.UserAzkarLogRepository;
import com.sabeel.azkar.repository.UserMirrorRepository;
import com.sabeel.azkar.service.AzkarReminderJob;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AzkarReminderJobTest {
    private UserAzkarLogRepository logRepository;
    private UserMirrorRepository userMirrorRepository;
    private AzkarReminderDayRepository reminderDayRepository;
    private OutboxService outboxService;
    private AzkarReminderJob job;
    private final UUID cairoUser = UUID.randomUUID();
    private final UUID newYorkUser = UUID.randomUUID();
    private final UUID noMirrorUser = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        logRepository = mock(UserAzkarLogRepository.class);
        userMirrorRepository = mock(UserMirrorRepository.class);
        reminderDayRepository = mock(AzkarReminderDayRepository.class);
        outboxService = mock(OutboxService.class);
        job = new AzkarReminderJob(logRepository, userMirrorRepository, reminderDayRepository, outboxService);
    }

    private UserMirror mirror(UUID userId, String timezone) {
        return UserMirror.builder().userId(userId).timezone(timezone).updatedAt(Instant.now()).build();
    }

    @Test
    void eachUserIsRemindedForTheirOwnLocalDate() {
        Instant now = Instant.parse("2026-06-15T22:30:00Z");
        when(logRepository.findActiveUserIdsSince(any())).thenReturn(List.of(cairoUser, newYorkUser));
        when(userMirrorRepository.findById(cairoUser)).thenReturn(Optional.of(mirror(cairoUser, "Africa/Cairo")));
        when(userMirrorRepository.findById(newYorkUser)).thenReturn(Optional.of(mirror(newYorkUser, "America/New_York")));
        int published = job.publishAll(now);
        assertEquals(4, published);
        verify(reminderDayRepository).save(argThat(d -> d.getUserId().equals(cairoUser)
                && d.getLocalDate().equals(LocalDate.of(2026, 6, 16)) && d.getCategoryCode().equals("MORNING")));
        verify(reminderDayRepository).save(argThat(d -> d.getUserId().equals(newYorkUser)
                && d.getLocalDate().equals(LocalDate.of(2026, 6, 15)) && d.getCategoryCode().equals("MORNING")));
        verify(outboxService, times(2)).record(eq("azkar.reminder"), eq(cairoUser.toString()),
                argThat(p -> p.toString().contains("2026-06-16")));
        verify(outboxService, times(2)).record(eq("azkar.reminder"), eq(newYorkUser.toString()),
                argThat(p -> p.toString().contains("2026-06-15")));
    }

    @Test
    void userWithoutMirrorFallsBackToUtcDate() {
        Instant now = Instant.parse("2026-06-15T22:30:00Z");
        when(logRepository.findActiveUserIdsSince(any())).thenReturn(List.of(noMirrorUser));
        when(userMirrorRepository.findById(noMirrorUser)).thenReturn(Optional.empty());
        int published = job.publishAll(now);
        assertEquals(2, published);
        verify(reminderDayRepository, times(2)).save(argThat(d -> d.getLocalDate().equals(LocalDate.of(2026, 6, 15))));
    }

    @Test
    void alreadyRemindedLocalDateIsNotDuplicated() {
        Instant now = Instant.parse("2026-06-15T22:30:00Z");
        when(logRepository.findActiveUserIdsSince(any())).thenReturn(List.of(cairoUser));
        when(userMirrorRepository.findById(cairoUser)).thenReturn(Optional.of(mirror(cairoUser, "Africa/Cairo")));
        when(reminderDayRepository.existsByUserIdAndLocalDateAndCategoryCode(eq(cairoUser), any(), any()))
                .thenReturn(true);
        int published = job.publishAll(now);
        assertEquals(0, published);
        verify(outboxService, never()).record(any(), any(), any());
    }
}
