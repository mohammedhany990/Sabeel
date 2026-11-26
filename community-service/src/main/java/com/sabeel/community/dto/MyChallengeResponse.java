package com.sabeel.community.dto;

import com.sabeel.community.domain.ChallengeParticipant;

public record MyChallengeResponse(String challengeId, int progress, boolean completed, String joinedAt,
                                  String completedAt) {
    public static MyChallengeResponse of(ChallengeParticipant p) {
        return new MyChallengeResponse(p.getChallengeId().toString(), p.getProgress(),
                p.getCompletedAt() != null, p.getJoinedAt().toString(),
                p.getCompletedAt() == null ? null : p.getCompletedAt().toString());
    }
}
