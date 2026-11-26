package com.sabeel.community.service;

import com.sabeel.community.domain.Challenge;
import com.sabeel.community.domain.ChallengeParticipant;
import com.sabeel.community.domain.Circle;
import com.sabeel.community.domain.CircleMember;
import com.sabeel.community.exception.ApiException;
import com.sabeel.community.repository.ChallengeParticipantRepository;
import com.sabeel.community.repository.ChallengeRepository;
import com.sabeel.community.repository.CircleMemberRepository;
import com.sabeel.community.repository.CircleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CommunityServiceTest {
    private ChallengeRepository challengeRepository;
    private ChallengeParticipantRepository participantRepository;
    private CircleRepository circleRepository;
    private CircleMemberRepository circleMemberRepository;
    private CommunityService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        challengeRepository = mock(ChallengeRepository.class);
        participantRepository = mock(ChallengeParticipantRepository.class);
        circleRepository = mock(CircleRepository.class);
        circleMemberRepository = mock(CircleMemberRepository.class);
        service = new CommunityService(challengeRepository, participantRepository, circleRepository,
                circleMemberRepository);
        when(challengeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(participantRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(circleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(circleMemberRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void joinIsIdempotent() {
        UUID challengeId = UUID.randomUUID();
        Challenge active = Challenge.builder().id(challengeId).metric(Challenge.Metric.MEMORIZATION_TASKS)
                .targetValue(5).startsAt(Instant.now().minus(1, ChronoUnit.HOURS))
                .endsAt(Instant.now().plus(1, ChronoUnit.DAYS)).build();
        when(challengeRepository.findById(challengeId)).thenReturn(Optional.of(active));
        when(participantRepository.findByChallengeIdAndUserId(challengeId, userId)).thenReturn(Optional.empty());
        service.joinChallenge(userId, challengeId);
        verify(participantRepository).save(any());

        ChallengeParticipant existing = ChallengeParticipant.builder().id(UUID.randomUUID())
                .challengeId(challengeId).userId(userId).progress(2).build();
        when(participantRepository.findByChallengeIdAndUserId(challengeId, userId))
                .thenReturn(Optional.of(existing));
        ChallengeParticipant res = service.joinChallenge(userId, challengeId);
        assertEquals(2, res.getProgress());
        verify(participantRepository, times(1)).save(any());
    }

    @Test
    void joinRejectsExpiredChallenge() {
        UUID challengeId = UUID.randomUUID();
        Challenge expired = Challenge.builder().id(challengeId).metric(Challenge.Metric.MEMORIZATION_TASKS)
                .targetValue(5).startsAt(Instant.now().minus(3, ChronoUnit.DAYS))
                .endsAt(Instant.now().minus(1, ChronoUnit.DAYS)).build();
        when(challengeRepository.findById(challengeId)).thenReturn(Optional.of(expired));
        assertThrows(ApiException.class, () -> service.joinChallenge(userId, challengeId));
    }

    @Test
    void createChallengeRejectsBackwardsWindow() {
        Instant now = Instant.now();
        assertThrows(ApiException.class, () -> service.createChallenge(userId, "Ramadan Push", null,
                "MEMORIZATION_TASKS", 30, now, now.minus(1, ChronoUnit.DAYS)));
    }

    @Test
    void circleCreateMakesOwnerAMember() {
        Circle circle = service.createCircle(userId, "Fajr Circle", null);
        assertEquals(userId, circle.getOwnerUserId());
        assertEquals(8, circle.getInviteCode().length());
        verify(circleMemberRepository).save(argThat(m ->
                m.getRole() == CircleMember.Role.OWNER && m.getUserId().equals(userId)));
    }

    @Test
    void joinByInviteCodeIsIdempotent() {
        Circle circle = Circle.builder().id(UUID.randomUUID()).inviteCode("ABCD2345").ownerUserId(UUID.randomUUID())
                .createdAt(Instant.now()).build();
        when(circleRepository.findByInviteCode("ABCD2345")).thenReturn(Optional.of(circle));
        when(circleMemberRepository.findByCircleIdAndUserId(circle.getId(), userId)).thenReturn(Optional.empty());
        service.joinCircle(userId, "abcd2345");
        verify(circleMemberRepository).save(any());
        when(circleMemberRepository.findByCircleIdAndUserId(circle.getId(), userId))
                .thenReturn(Optional.of(CircleMember.builder().id(UUID.randomUUID()).circleId(circle.getId())
                        .userId(userId).role(CircleMember.Role.MEMBER).joinedAt(Instant.now()).build()));
        service.joinCircle(userId, "ABCD2345");
        verify(circleMemberRepository, times(1)).save(any());
    }

    @Test
    void unknownInviteCodeIsNotFound() {
        when(circleRepository.findByInviteCode(any())).thenReturn(Optional.empty());
        assertThrows(ApiException.class, () -> service.joinCircle(userId, "ZZZZ9999"));
    }

    @Test
    void membersEndpointRejectsNonMember() {
        UUID circleId = UUID.randomUUID();
        when(circleMemberRepository.findByCircleIdAndUserId(circleId, userId)).thenReturn(Optional.empty());
        assertThrows(ApiException.class, () -> service.members(userId, circleId));
    }
}
