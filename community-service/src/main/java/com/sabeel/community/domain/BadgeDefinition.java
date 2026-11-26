package com.sabeel.community.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "badge_definitions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BadgeDefinition {
    public enum Trigger { TASKS_COMPLETED, PLANS_COMPLETED, STREAK_DAYS }

    @Id
    @Column(length = 60)
    private String code;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 500)
    private String description;

    @Column(length = 120)
    private String titleAr;

    @Column(length = 500)
    private String descriptionAr;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Trigger triggerType;

    @Column(nullable = false)
    private int threshold;
}
