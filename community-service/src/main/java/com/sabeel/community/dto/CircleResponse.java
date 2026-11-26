package com.sabeel.community.dto;

import com.sabeel.community.domain.Circle;

public record CircleResponse(String id, String name, String description, String inviteCode, String createdAt) {
    public static CircleResponse of(Circle c) {
        return new CircleResponse(c.getId().toString(), c.getName(), c.getDescription(), c.getInviteCode(),
                c.getCreatedAt().toString());
    }
}
