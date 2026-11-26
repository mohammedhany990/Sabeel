package com.sabeel.community.dto;

import com.sabeel.community.domain.BadgeDefinition;
import com.sabeel.community.domain.UserBadge;

public record BadgeResponse(String code, String title, String description, String triggerType, int threshold,
                            String awardedAt) {
    public static BadgeResponse definition(BadgeDefinition b) {
        return new BadgeResponse(b.getCode(), b.getTitle(), b.getDescription(), b.getTriggerType().name(),
                b.getThreshold(), null);
    }

    public static BadgeResponse earned(UserBadge b, String title) {
        return new BadgeResponse(b.getBadgeCode(), title, null, null, 0, b.getAwardedAt().toString());
    }
}
