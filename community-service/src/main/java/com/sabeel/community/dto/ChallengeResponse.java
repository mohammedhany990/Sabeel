package com.sabeel.community.dto;

import com.sabeel.community.domain.Challenge;
import com.sabeel.community.domain.ChallengeParticipant;

public record ChallengeResponse(String id, String code, String title, String description, String metric,
                                int targetValue, String startsAt, String endsAt, long participants) {
    public static ChallengeResponse of(Challenge c, long participants) {
        return new ChallengeResponse(c.getId().toString(), c.getCode(), c.getTitle(), c.getDescription(),
                c.getMetric().name(), c.getTargetValue(), c.getStartsAt().toString(), c.getEndsAt().toString(),
                participants);
    }
}
