package com.sabeel.azkar;

import com.sabeel.azkar.domain.*;
import com.sabeel.azkar.dto.ProgressResponse;
import com.sabeel.azkar.event.OutboxService;
import com.sabeel.azkar.repository.*;
import com.sabeel.azkar.service.AzkarService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AzkarServiceTest {
    private AzkarItemRepository itemRepository;
    private UserAzkarLogRepository logRepository;
    private AzkarStreakRepository streakRepository;
    private OutboxService outboxService;
    private AzkarService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        itemRepository = mock(AzkarItemRepository.class);
        logRepository = mock(UserAzkarLogRepository.class);
        streakRepository = mock(AzkarStreakRepository.class);
        outboxService = mock(OutboxService.class);
        service = new AzkarService(mock(AzkarCategoryRepository.class), itemRepository, logRepository, streakRepository, outboxService);
    }

    private AzkarItem item(int id, int target) {
        AzkarCategory category = AzkarCategory.builder().id(1).code("MORNING").nameEn("Morning").nameAr("الصباح").sortOrder(1).build();
        return AzkarItem.builder().id(id).category(category).textAr("ذكر").repeatTarget(target).sortOrder(id).build();
    }

    @Test
    void progressIncrementsUpToTheTargetThenStaysCapped() {
        AzkarItem item = item(1, 3);
        when(itemRepository.findById(1)).thenReturn(Optional.of(item));
        LocalDate today = LocalDate.of(2026, 3, 10);
        UserAzkarLog existing = UserAzkarLog.builder().userId(userId).azkarItemId(1).logDate(today).count(2).build();
        when(logRepository.findByUserIdAndAzkarItemIdAndLogDate(eq(userId), eq(1), any())).thenReturn(Optional.of(existing));
        when(logRepository.findByUserIdAndLogDate(eq(userId), any())).thenReturn(List.of(existing));
        when(itemRepository.findByCategoryCodeOrderBySortOrder("MORNING")).thenReturn(List.of(item));
        ProgressResponse first = service.progress(userId, 1, today);
        assertEquals(3, first.count());
        assertTrue(first.itemDone());
        ProgressResponse second = service.progress(userId, 1, today);
        assertEquals(3, second.count());
        verify(logRepository, times(1)).save(any(UserAzkarLog.class));
    }

    @Test
    void completingCategoryStartsStreakAtOneWithoutMilestone() {
        AzkarItem item = item(1, 1);
        when(itemRepository.findById(1)).thenReturn(Optional.of(item));
        when(logRepository.findByUserIdAndAzkarItemIdAndLogDate(eq(userId), eq(1), any())).thenReturn(Optional.empty());
        when(itemRepository.findByCategoryCodeOrderBySortOrder("MORNING")).thenReturn(List.of(item));
        LocalDate today = LocalDate.of(2026, 3, 10);
        when(logRepository.findByUserIdAndLogDate(eq(userId), any())).thenAnswer(inv -> List.of(
                UserAzkarLog.builder().userId(userId).azkarItemId(1).logDate(today).count(1).build()));
        when(streakRepository.findByUserIdAndCategoryCode(userId, "MORNING")).thenReturn(Optional.empty());
        ProgressResponse response = service.progress(userId, 1, today);
        assertTrue(response.categoryComplete());
        verify(streakRepository).save(argThat(s -> s.getCurrentStreak() == 1 && s.getLongestStreak() == 1));
        verify(outboxService, never()).record(any(), any(), any());
    }

    @Test
    void seventhConsecutiveDayPublishesMilestone() {
        AzkarItem item = item(1, 1);
        LocalDate today = LocalDate.of(2026, 3, 10);
        when(itemRepository.findById(1)).thenReturn(Optional.of(item));
        when(logRepository.findByUserIdAndAzkarItemIdAndLogDate(eq(userId), eq(1), any())).thenReturn(Optional.empty());
        when(itemRepository.findByCategoryCodeOrderBySortOrder("MORNING")).thenReturn(List.of(item));
        when(logRepository.findByUserIdAndLogDate(eq(userId), any())).thenAnswer(inv -> List.of(
                UserAzkarLog.builder().userId(userId).azkarItemId(1).logDate(today).count(1).build()));
        AzkarStreak streak = AzkarStreak.builder().userId(userId).categoryCode("MORNING")
                .currentStreak(6).longestStreak(6).lastCompletedDate(today.minusDays(1)).build();
        when(streakRepository.findByUserIdAndCategoryCode(userId, "MORNING")).thenReturn(Optional.of(streak));
        service.progress(userId, 1, today);
        assertEquals(7, streak.getCurrentStreak());
        verify(outboxService).record(eq("azkar.streak.milestone"), eq(userId.toString()), argThat(p -> p.toString().contains("7")));
    }

    @Test
    void sameDayRecompletionDoesNotAdvanceStreak() {
        AzkarItem item = item(1, 1);
        LocalDate today = LocalDate.of(2026, 3, 10);
        when(itemRepository.findById(1)).thenReturn(Optional.of(item));
        when(logRepository.findByUserIdAndAzkarItemIdAndLogDate(eq(userId), eq(1), any())).thenReturn(Optional.empty());
        when(itemRepository.findByCategoryCodeOrderBySortOrder("MORNING")).thenReturn(List.of(item));
        when(logRepository.findByUserIdAndLogDate(eq(userId), any())).thenAnswer(inv -> List.of(
                UserAzkarLog.builder().userId(userId).azkarItemId(1).logDate(today).count(1).build()));
        AzkarStreak streak = AzkarStreak.builder().userId(userId).categoryCode("MORNING")
                .currentStreak(4).longestStreak(9).lastCompletedDate(today).build();
        when(streakRepository.findByUserIdAndCategoryCode(userId, "MORNING")).thenReturn(Optional.of(streak));
        service.progress(userId, 1, today);
        assertEquals(4, streak.getCurrentStreak());
        verify(streakRepository, never()).save(any());
        verify(outboxService, never()).record(any(), any(), any());
    }

    @Test
    void progressIsLoggedOnTheExplicitLocalDateNotTheServerDate() {
        AzkarItem item = item(1, 3);
        LocalDate userLocalDate = LocalDate.of(2026, 1, 5);
        when(itemRepository.findById(1)).thenReturn(Optional.of(item));
        when(logRepository.findByUserIdAndAzkarItemIdAndLogDate(userId, 1, userLocalDate)).thenReturn(Optional.empty());
        when(itemRepository.findByCategoryCodeOrderBySortOrder("MORNING")).thenReturn(List.of(item));
        service.progress(userId, 1, userLocalDate);
        verify(logRepository).save(argThat(l -> l.getLogDate().equals(userLocalDate) && l.getCount() == 1));
    }

    @Test
    void brokenStreakRestartsAtOne() {
        AzkarItem item = item(1, 1);
        LocalDate today = LocalDate.of(2026, 3, 10);
        when(itemRepository.findById(1)).thenReturn(Optional.of(item));
        when(logRepository.findByUserIdAndAzkarItemIdAndLogDate(eq(userId), eq(1), any())).thenReturn(Optional.empty());
        when(itemRepository.findByCategoryCodeOrderBySortOrder("MORNING")).thenReturn(List.of(item));
        when(logRepository.findByUserIdAndLogDate(eq(userId), any())).thenAnswer(inv -> List.of(
                UserAzkarLog.builder().userId(userId).azkarItemId(1).logDate(today).count(1).build()));
        AzkarStreak streak = AzkarStreak.builder().userId(userId).categoryCode("MORNING")
                .currentStreak(5).longestStreak(12).lastCompletedDate(today.minusDays(3)).build();
        when(streakRepository.findByUserIdAndCategoryCode(userId, "MORNING")).thenReturn(Optional.of(streak));
        service.progress(userId, 1, today);
        assertEquals(1, streak.getCurrentStreak());
        assertEquals(12, streak.getLongestStreak());
    }
}
