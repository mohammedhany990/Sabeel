package com.sabeel.community.dto;

import com.sabeel.community.domain.BadgeDefinition;
import com.sabeel.community.domain.UserBadge;

public record BadgeResponse(String code, String title, String description, String triggerType, int threshold,
                            String awardedAt,
                            String titleAr, String descriptionAr) {
    public static BadgeResponse definition(BadgeDefinition b) {
        return new BadgeResponse(b.getCode(), b.getTitle(), b.getDescription(), b.getTriggerType().name(),
                b.getThreshold(), null, b.getTitleAr(), b.getDescriptionAr());
    }

    public static BadgeResponse earned(UserBadge b, String title) {
        return earned(b, title, null);
    }

    public static BadgeResponse earned(UserBadge b, String title, String titleAr) {
        return new BadgeResponse(b.getBadgeCode(), title, null, null, 0, b.getAwardedAt().toString(), titleAr, null);
    }
}
