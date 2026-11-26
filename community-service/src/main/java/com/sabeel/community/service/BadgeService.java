package com.sabeel.community.service;

import com.sabeel.community.domain.BadgeDefinition;
import com.sabeel.community.domain.Challenge;
import com.sabeel.community.domain.ChallengeParticipant;
import com.sabeel.community.domain.UserBadge;
import com.sabeel.community.domain.UserStat;
import com.sabeel.community.event.OutboxService;
import com.sabeel.community.repository.BadgeDefinitionRepository;
import com.sabeel.community.repository.ChallengeParticipantRepository;
import com.sabeel.community.repository.ChallengeRepository;
import com.sabeel.community.repository.UserBadgeRepository;
import com.sabeel.community.repository.UserStatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.sabeel.community.config.KafkaConfig.TOPIC_BADGE_AWARDED;

@Service
@RequiredArgsConstructor
public class BadgeService {
    private final UserStatRepository userStatRepository;
    private final BadgeDefinitionRepository badgeDefinitionRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final ChallengeRepository challengeRepository;
    private final ChallengeParticipantRepository participantRepository;
    private final OutboxService outboxService;

    @Transactional
    public void onTaskCompleted(UUID userId) {
        applyProgress(userId, BadgeDefinition.Trigger.TASKS_COMPLETED, Challenge.Metric.MEMORIZATION_TASKS,
                current(BadgeDefinition.Trigger.TASKS_COMPLETED, userId) + 1, true);
    }

    @Transactional
    public void onPlanCompleted(UUID userId) {
        applyProgress(userId, BadgeDefinition.Trigger.PLANS_COMPLETED, Challenge.Metric.PLANS_COMPLETED,
                current(BadgeDefinition.Trigger.PLANS_COMPLETED, userId) + 1, true);
    }

    @Transactional
    public void onStreakMilestone(UUID userId, long streakDays) {
        long best = Math.max(current(BadgeDefinition.Trigger.STREAK_DAYS, userId), streakDays);
        applyProgress(userId, BadgeDefinition.Trigger.STREAK_DAYS, Challenge.Metric.STREAK_DAYS, best, false);
    }

    private void applyProgress(UUID userId, BadgeDefinition.Trigger trigger, Challenge.Metric metric,
                               long newValue, boolean incrementChallenges) {
        userStatRepository.save(UserStat.builder()
                .id(userStatRepository.findByUserIdAndMetric(userId, trigger.name()).map(UserStat::getId).orElse(UUID.randomUUID()))
                .userId(userId).metric(trigger.name()).value(newValue).build());
        for (BadgeDefinition badge : badgeDefinitionRepository.findByTriggerType(trigger)) {
            if (newValue >= badge.getThreshold()
                    && userBadgeRepository.findByUserIdAndBadgeCode(userId, badge.getCode()).isEmpty()) {
                userBadgeRepository.save(UserBadge.builder().id(UUID.randomUUID()).userId(userId)
                        .badgeCode(badge.getCode()).awardedAt(Instant.now()).build());
                outboxService.record(TOPIC_BADGE_AWARDED, userId.toString(), Map.of(
                        "userId", userId.toString(), "badgeCode", badge.getCode(), "title", badge.getTitle()));
            }
        }
        Instant now = Instant.now();
        for (Challenge challenge : challengeRepository.findByMetricAndStartsAtBeforeAndEndsAtAfter(metric, now, now)) {
            participantRepository.findByChallengeIdAndUserId(challenge.getId(), userId)
                    .filter(p -> p.getCompletedAt() == null)
                    .ifPresent(p -> {
                        long progress = incrementChallenges ? p.getProgress() + 1 : Math.max(p.getProgress(), newValue);
                        p.setProgress((int) Math.min(progress, Integer.MAX_VALUE));
                        if (p.getProgress() >= challenge.getTargetValue()) {
                            p.setCompletedAt(now);
                        }
                        participantRepository.save(p);
                    });
        }
    }

    private long current(BadgeDefinition.Trigger trigger, UUID userId) {
        return userStatRepository.findByUserIdAndMetric(userId, trigger.name()).map(UserStat::getValue).orElse(0L);
    }

    public List<BadgeDefinition> definitions() {
        return badgeDefinitionRepository.findAll();
    }

    public List<UserBadge> myBadges(UUID userId) {
        return userBadgeRepository.findByUserIdOrderByAwardedAtDesc(userId);
    }
}
