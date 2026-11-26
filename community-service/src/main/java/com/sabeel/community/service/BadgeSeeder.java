package com.sabeel.community.service;

import com.sabeel.community.domain.BadgeDefinition;
import com.sabeel.community.repository.BadgeDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class BadgeSeeder implements CommandLineRunner {
    private final BadgeDefinitionRepository repository;

    @Override
    public void run(String... args) {
        List<BadgeDefinition> defaults = List.of(
                badge("first-task", "First Step", "Complete your first memorization task", BadgeDefinition.Trigger.TASKS_COMPLETED, 1),
                badge("ten-tasks", "Consistent", "Complete 10 memorization tasks", BadgeDefinition.Trigger.TASKS_COMPLETED, 10),
                badge("hundred-tasks", "Hafiz Journey", "Complete 100 memorization tasks", BadgeDefinition.Trigger.TASKS_COMPLETED, 100),
                badge("first-plan", "Plan Complete", "Finish a full memorization plan", BadgeDefinition.Trigger.PLANS_COMPLETED, 1),
                badge("streak-7", "Week of Worship", "Reach a 7-day azkar streak", BadgeDefinition.Trigger.STREAK_DAYS, 7),
                badge("streak-30", "Month of Devotion", "Reach a 30-day azkar streak", BadgeDefinition.Trigger.STREAK_DAYS, 30));
        for (BadgeDefinition b : defaults) {
            if (!repository.existsById(b.getCode())) {
                repository.save(b);
            }
        }
    }

    private BadgeDefinition badge(String code, String title, String description, BadgeDefinition.Trigger trigger, int threshold) {
        return BadgeDefinition.builder().code(code).title(title).description(description)
                .triggerType(trigger).threshold(threshold).build();
    }
}
