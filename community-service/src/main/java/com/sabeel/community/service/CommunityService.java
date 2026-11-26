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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommunityService {
    private static final String INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final ChallengeRepository challengeRepository;
    private final ChallengeParticipantRepository participantRepository;
    private final CircleRepository circleRepository;
    private final CircleMemberRepository circleMemberRepository;
    private final SecureRandom random = new SecureRandom();

    public List<Challenge> activeChallenges() {
        Instant now = Instant.now();
        return challengeRepository.findByStartsAtBeforeAndEndsAtAfterOrderByEndsAtAsc(now, now);
    }

    public Challenge createChallenge(UUID creator, String title, String description, String metric,
                                     int targetValue, Instant startsAt, Instant endsAt) {
        if (!endsAt.isAfter(startsAt)) {
            throw ApiException.badRequest("endsAt must be after startsAt");
        }
        Challenge challenge = Challenge.builder().id(UUID.randomUUID()).code(uniqueCode(title))
                .title(title).description(description).metric(parseMetric(metric))
                .targetValue(targetValue).startsAt(startsAt).endsAt(endsAt)
                .createdBy(creator).createdAt(Instant.now()).build();
        return challengeRepository.save(challenge);
    }

    @Transactional
    public ChallengeParticipant joinChallenge(UUID userId, UUID challengeId) {
        Challenge challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> ApiException.notFound("challenge not found"));
        Instant now = Instant.now();
        if (now.isBefore(challenge.getStartsAt()) || now.isAfter(challenge.getEndsAt())) {
            throw ApiException.conflict("challenge is not active");
        }
        return participantRepository.findByChallengeIdAndUserId(challengeId, userId)
                .orElseGet(() -> participantRepository.save(ChallengeParticipant.builder()
                        .id(UUID.randomUUID()).challengeId(challengeId).userId(userId)
                        .progress(0).joinedAt(now).build()));
    }

    public List<ChallengeParticipant> myChallenges(UUID userId) {
        return participantRepository.findByUserId(userId);
    }

    @Transactional
    public Circle createCircle(UUID owner, String name, String description) {
        Circle circle = circleRepository.save(Circle.builder().id(UUID.randomUUID()).name(name)
                .description(description).inviteCode(newInviteCode()).ownerUserId(owner)
                .createdAt(Instant.now()).build());
        circleMemberRepository.save(CircleMember.builder().id(UUID.randomUUID()).circleId(circle.getId())
                .userId(owner).role(CircleMember.Role.OWNER).joinedAt(Instant.now()).build());
        return circle;
    }

    @Transactional
    public Circle joinCircle(UUID userId, String inviteCode) {
        Circle circle = circleRepository.findByInviteCode(inviteCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> ApiException.notFound("no circle with that invite code"));
        circleMemberRepository.findByCircleIdAndUserId(circle.getId(), userId)
                .orElseGet(() -> circleMemberRepository.save(CircleMember.builder().id(UUID.randomUUID())
                        .circleId(circle.getId()).userId(userId).role(CircleMember.Role.MEMBER)
                        .joinedAt(Instant.now()).build()));
        return circle;
    }

    public List<Circle> myCircles(UUID userId) {
        return circleMemberRepository.findByUserId(userId).stream()
                .map(m -> circleRepository.findById(m.getCircleId()).orElse(null))
                .filter(c -> c != null).toList();
    }

    public List<CircleMember> members(UUID userId, UUID circleId) {
        circleMemberRepository.findByCircleIdAndUserId(circleId, userId)
                .orElseThrow(() -> ApiException.notFound("circle not found"));
        return circleMemberRepository.findByCircleId(circleId);
    }

    private Challenge.Metric parseMetric(String metric) {
        try {
            return Challenge.Metric.valueOf(metric.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw ApiException.badRequest("unknown metric '" + metric
                    + "'; one of MEMORIZATION_TASKS, PLANS_COMPLETED, STREAK_DAYS");
        }
    }

    private String uniqueCode(String title) {
        String base = title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        if (base.isBlank()) {
            base = "challenge";
        }
        String code = base;
        int suffix = 2;
        while (challengeRepository.existsByCode(code)) {
            code = base + "-" + suffix++;
        }
        return code;
    }

    private String newInviteCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 8; i++) {
                sb.append(INVITE_ALPHABET.charAt(random.nextInt(INVITE_ALPHABET.length())));
            }
            code = sb.toString();
        } while (circleRepository.existsByInviteCode(code));
        return code;
    }
}
