package com.sabeel.azkar.service;

import com.sabeel.azkar.domain.*;
import com.sabeel.azkar.dto.*;
import com.sabeel.azkar.event.OutboxService;
import com.sabeel.azkar.exception.ApiException;
import com.sabeel.azkar.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import static com.sabeel.azkar.config.KafkaConfig.TOPIC_STREAK_MILESTONE;

@Service
@RequiredArgsConstructor
public class AzkarService {
    private static final Set<Integer> MILESTONES = Set.of(7, 30, 100, 365);

    private final AzkarCategoryRepository categoryRepository;
    private final AzkarItemRepository itemRepository;
    private final UserAzkarLogRepository logRepository;
    private final AzkarStreakRepository streakRepository;
    private final OutboxService outboxService;

    public List<CategoryResponse> categories() {
        return categoryRepository.findAll().stream()
                .sorted(Comparator.comparingInt(AzkarCategory::getSortOrder))
                .map(c -> new CategoryResponse(c.getId(), c.getCode(), c.getNameEn(), c.getNameAr(),
                        itemRepository.countByCategoryCode(c.getCode())))
                .toList();
    }

    public List<ItemResponse> items(String categoryCode, UUID userId, LocalDate date) {
        AzkarCategory category = categoryRepository.findByCode(categoryCode.toUpperCase())
                .orElseThrow(() -> ApiException.notFound("unknown azkar category " + categoryCode));
        Map<Integer, Integer> todayCounts = todayCounts(userId, date);
        return itemRepository.findByCategoryCodeOrderBySortOrder(category.getCode()).stream()
                .map(i -> toItemResponse(i, todayCounts))
                .toList();
    }

    public List<TodayCategoryResponse> today(UUID userId, LocalDate date) {
        Map<Integer, Integer> todayCounts = todayCounts(userId, date);
        return categoryRepository.findAll().stream()
                .sorted(Comparator.comparingInt(AzkarCategory::getSortOrder))
                .map(c -> {
                    List<ItemResponse> items = itemRepository.findByCategoryCodeOrderBySortOrder(c.getCode()).stream()
                            .map(i -> toItemResponse(i, todayCounts)).toList();
                    int completed = (int) items.stream().filter(ItemResponse::done).count();
                    return new TodayCategoryResponse(c.getCode(), c.getNameEn(), c.getNameAr(),
                            completed, items.size(), completed == items.size() && !items.isEmpty(), items);
                })
                .toList();
    }

    @Transactional
    public ProgressResponse progress(UUID userId, Integer itemId, LocalDate today) {
        AzkarItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> ApiException.notFound("unknown azkar item " + itemId));
        UserAzkarLog logEntry = logRepository.findByUserIdAndAzkarItemIdAndLogDate(userId, itemId, today)
                .orElse(UserAzkarLog.builder().userId(userId).azkarItemId(itemId).logDate(today).count(0).build());
        if (logEntry.getCount() < item.getRepeatTarget()) {
            logEntry.setCount(logEntry.getCount() + 1);
            logRepository.save(logEntry);
        }
        boolean itemDone = logEntry.getCount() >= item.getRepeatTarget();
        boolean categoryComplete = isCategoryComplete(userId, item.getCategory().getCode(), today);
        if (categoryComplete) {
            registerStreakCompletion(userId, item.getCategory().getCode(), today);
        }
        return new ProgressResponse(itemId, logEntry.getCount(), item.getRepeatTarget(), itemDone, categoryComplete);
    }

    public List<StreakResponse> streaks(UUID userId) {
        return streakRepository.findByUserId(userId).stream()
                .map(s -> new StreakResponse(s.getCategoryCode(), s.getCurrentStreak(), s.getLongestStreak(), s.getLastCompletedDate()))
                .toList();
    }

    private boolean isCategoryComplete(UUID userId, String categoryCode, LocalDate today) {
        Map<Integer, Integer> counts = logRepository.findByUserIdAndLogDate(userId, today).stream()
                .collect(Collectors.toMap(UserAzkarLog::getAzkarItemId, UserAzkarLog::getCount));
        return itemRepository.findByCategoryCodeOrderBySortOrder(categoryCode).stream()
                .allMatch(i -> counts.getOrDefault(i.getId(), 0) >= i.getRepeatTarget());
    }

    private void registerStreakCompletion(UUID userId, String categoryCode, LocalDate today) {
        AzkarStreak streak = streakRepository.findByUserIdAndCategoryCode(userId, categoryCode)
                .orElse(AzkarStreak.builder().userId(userId).categoryCode(categoryCode)
                        .currentStreak(0).longestStreak(0).build());
        if (today.equals(streak.getLastCompletedDate())) {
            return;
        }
        boolean consecutive = streak.getLastCompletedDate() != null
                && streak.getLastCompletedDate().equals(today.minusDays(1));
        streak.setCurrentStreak(consecutive ? streak.getCurrentStreak() + 1 : 1);
        streak.setLongestStreak(Math.max(streak.getLongestStreak(), streak.getCurrentStreak()));
        streak.setLastCompletedDate(today);
        streakRepository.save(streak);
        if (MILESTONES.contains(streak.getCurrentStreak())) {
            int days = streak.getCurrentStreak();
            outboxService.record(TOPIC_STREAK_MILESTONE, userId.toString(), Map.of(
                    "userId", userId.toString(), "categoryCode", categoryCode, "streakDays", days));
        }
    }

    private Map<Integer, Integer> todayCounts(UUID userId, LocalDate date) {
        if (userId == null) {
            return Map.of();
        }
        return logRepository.findByUserIdAndLogDate(userId, date).stream()
                .collect(Collectors.toMap(UserAzkarLog::getAzkarItemId, UserAzkarLog::getCount));
    }

    private ItemResponse toItemResponse(AzkarItem i, Map<Integer, Integer> todayCounts) {
        int count = todayCounts.getOrDefault(i.getId(), 0);
        return new ItemResponse(i.getId(), i.getTextAr(), i.getRepeatTarget(), i.getReference(),
                count, count >= i.getRepeatTarget(), i.getTextEn(), i.getReferenceAr());
    }
}
