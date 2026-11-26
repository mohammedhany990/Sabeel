package com.sabeel.community.service;

import com.sabeel.community.domain.BadgeDefinition;
import com.sabeel.community.domain.Challenge;
import com.sabeel.community.domain.ChallengeParticipant;
import com.sabeel.community.domain.UserStat;
import com.sabeel.community.event.OutboxService;
import com.sabeel.community.repository.BadgeDefinitionRepository;
import com.sabeel.community.repository.ChallengeParticipantRepository;
import com.sabeel.community.repository.ChallengeRepository;
import com.sabeel.community.repository.UserBadgeRepository;
import com.sabeel.community.repository.UserStatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BadgeServiceTest {
    private UserStatRepository userStatRepository;
    private BadgeDefinitionRepository badgeDefinitionRepository;
    private UserBadgeRepository userBadgeRepository;
    private ChallengeRepository challengeRepository;
    private ChallengeParticipantRepository participantRepository;
    private OutboxService outboxService;
    private BadgeService badgeService;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        userStatRepository = mock(UserStatRepository.class);
        badgeDefinitionRepository = mock(BadgeDefinitionRepository.class);
        userBadgeRepository = mock(UserBadgeRepository.class);
        challengeRepository = mock(ChallengeRepository.class);
        participantRepository = mock(ChallengeParticipantRepository.class);
        outboxService = mock(OutboxService.class);
        badgeService = new BadgeService(userStatRepository, badgeDefinitionRepository, userBadgeRepository,
                challengeRepository, participantRepository, outboxService);
        when(userStatRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userBadgeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(participantRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(challengeRepository.findByMetricAndStartsAtBeforeAndEndsAtAfter(any(), any(), any()))
                .thenReturn(List.of());
    }

    @Test
    void firstTaskAwardsFirstStepBadge() {
        when(userStatRepository.findByUserIdAndMetric(userId, "TASKS_COMPLETED")).thenReturn(Optional.empty());
        when(badgeDefinitionRepository.findByTriggerType(BadgeDefinition.Trigger.TASKS_COMPLETED))
                .thenReturn(List.of(BadgeDefinition.builder().code("first-task").title("First Step")
                        .triggerType(BadgeDefinition.Trigger.TASKS_COMPLETED).threshold(1).build()));
        when(userBadgeRepository.findByUserIdAndBadgeCode(userId, "first-task")).thenReturn(Optional.empty());
        badgeService.onTaskCompleted(userId);
        verify(userBadgeRepository).save(argThat(b -> b.getBadgeCode().equals("first-task")));
        verify(outboxService).record(eq("community.badge.awarded"), eq(userId.toString()), anyMap());
    }

    @Test
    void alreadyAwardedBadgeIsNotAwardedTwice() {
        when(userStatRepository.findByUserIdAndMetric(userId, "TASKS_COMPLETED"))
                .thenReturn(Optional.of(UserStat.builder().userId(userId).metric("TASKS_COMPLETED").value(4).build()));
        when(badgeDefinitionRepository.findByTriggerType(BadgeDefinition.Trigger.TASKS_COMPLETED))
                .thenReturn(List.of(BadgeDefinition.builder().code("first-task").title("First Step")
                        .triggerType(BadgeDefinition.Trigger.TASKS_COMPLETED).threshold(1).build()));
        when(userBadgeRepository.findByUserIdAndBadgeCode(userId, "first-task"))
                .thenReturn(Optional.of(new com.sabeel.community.domain.UserBadge(
                        UUID.randomUUID(), userId, "first-task", Instant.now())));
        badgeService.onTaskCompleted(userId);
        verify(userBadgeRepository, never()).save(any());
        verify(outboxService, never()).record(any(), any(), anyMap());
    }

    @Test
    void belowThresholdAwardsNothing() {
        when(userStatRepository.findByUserIdAndMetric(userId, "TASKS_COMPLETED")).thenReturn(Optional.empty());
        when(badgeDefinitionRepository.findByTriggerType(BadgeDefinition.Trigger.TASKS_COMPLETED))
                .thenReturn(List.of(BadgeDefinition.builder().code("ten-tasks").title("Consistent")
                        .triggerType(BadgeDefinition.Trigger.TASKS_COMPLETED).threshold(10).build()));
        badgeService.onTaskCompleted(userId);
        verify(userBadgeRepository, never()).save(any());
    }

    @Test
    void streakMilestoneKeepsBestNotLast() {
        when(userStatRepository.findByUserIdAndMetric(userId, "STREAK_DAYS"))
                .thenReturn(Optional.of(UserStat.builder().userId(userId).metric("STREAK_DAYS").value(12).build()));
        when(badgeDefinitionRepository.findByTriggerType(BadgeDefinition.Trigger.STREAK_DAYS))
                .thenReturn(List.of(BadgeDefinition.builder().code("streak-7").title("Week of Worship")
                        .triggerType(BadgeDefinition.Trigger.STREAK_DAYS).threshold(7).build()));
        when(userBadgeRepository.findByUserIdAndBadgeCode(userId, "streak-7")).thenReturn(Optional.empty());
        badgeService.onStreakMilestone(userId, 8);
        verify(userStatRepository).save(argThat(s -> s.getValue() == 12));
        verify(userBadgeRepository).save(any());
    }

    @Test
    void taskCompletionAdvancesJoinedActiveChallenge() {
        when(userStatRepository.findByUserIdAndMetric(userId, "TASKS_COMPLETED")).thenReturn(Optional.empty());
        when(badgeDefinitionRepository.findByTriggerType(any())).thenReturn(List.of());
        Challenge challenge = Challenge.builder().id(UUID.randomUUID()).metric(Challenge.Metric.MEMORIZATION_TASKS)
                .targetValue(3).startsAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .endsAt(Instant.now().plus(1, ChronoUnit.DAYS)).build();
        ChallengeParticipant participant = ChallengeParticipant.builder().id(UUID.randomUUID())
                .challengeId(challenge.getId()).userId(userId).progress(2).build();
        when(challengeRepository.findByMetricAndStartsAtBeforeAndEndsAtAfter(eq(Challenge.Metric.MEMORIZATION_TASKS), any(), any()))
                .thenReturn(List.of(challenge));
        when(participantRepository.findByChallengeIdAndUserId(challenge.getId(), userId))
                .thenReturn(Optional.of(participant));
        badgeService.onTaskCompleted(userId);
        assertEquals(3, participant.getProgress());
        assertNotNull(participant.getCompletedAt());
    }

    @Test
    void completedChallengeIsNotAdvancedFurther() {
        when(userStatRepository.findByUserIdAndMetric(userId, "TASKS_COMPLETED")).thenReturn(Optional.empty());
        when(badgeDefinitionRepository.findByTriggerType(any())).thenReturn(List.of());
        Challenge challenge = Challenge.builder().id(UUID.randomUUID()).metric(Challenge.Metric.MEMORIZATION_TASKS)
                .targetValue(3).startsAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .endsAt(Instant.now().plus(1, ChronoUnit.DAYS)).build();
        ChallengeParticipant participant = ChallengeParticipant.builder().id(UUID.randomUUID())
                .challengeId(challenge.getId()).userId(userId).progress(3)
                .completedAt(Instant.now()).build();
        when(challengeRepository.findByMetricAndStartsAtBeforeAndEndsAtAfter(eq(Challenge.Metric.MEMORIZATION_TASKS), any(), any()))
                .thenReturn(List.of(challenge));
        when(participantRepository.findByChallengeIdAndUserId(challenge.getId(), userId))
                .thenReturn(Optional.of(participant));
        badgeService.onTaskCompleted(userId);
        assertEquals(3, participant.getProgress());
        verify(participantRepository, never()).save(any());
    }
}
