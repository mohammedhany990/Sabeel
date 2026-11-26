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
        for (BadgeDefinition wanted : defaults()) {
            BadgeDefinition existing = repository.findById(wanted.getCode()).orElse(null);
            if (existing == null) {
                repository.save(wanted);
            } else if (existing.getTitleAr() == null || existing.getDescriptionAr() == null) {
                existing.setTitleAr(wanted.getTitleAr());
                existing.setDescriptionAr(wanted.getDescriptionAr());
                repository.save(existing);
            }
        }
    }

    static List<BadgeDefinition> defaults() {
        return List.of(
                badge("first-task", "First Step", "الخطوة الأولى", "Complete your first memorization task",
                        "أكمل أول مهمة حفظ لك", BadgeDefinition.Trigger.TASKS_COMPLETED, 1),
                badge("ten-tasks", "Consistent", "المواظب", "Complete 10 memorization tasks",
                        "أكمل 10 مهام حفظ", BadgeDefinition.Trigger.TASKS_COMPLETED, 10),
                badge("hundred-tasks", "Hafiz Journey", "رحلة الحفظ", "Complete 100 memorization tasks",
                        "أكمل 100 مهمة حفظ", BadgeDefinition.Trigger.TASKS_COMPLETED, 100),
                badge("first-plan", "Plan Complete", "خطة مكتملة", "Finish a full memorization plan",
                        "أنهِ خطة حفظ كاملة", BadgeDefinition.Trigger.PLANS_COMPLETED, 1),
                badge("streak-7", "Week of Worship", "أسبوع من العبادة", "Reach a 7-day azkar streak",
                        "حافظ على الأذكار 7 أيام متتالية", BadgeDefinition.Trigger.STREAK_DAYS, 7),
                badge("streak-30", "Month of Devotion", "شهر من المداومة", "Reach a 30-day azkar streak",
                        "حافظ على الأذكار 30 يوماً متتالية", BadgeDefinition.Trigger.STREAK_DAYS, 30));
    }

    private static BadgeDefinition badge(String code, String title, String titleAr, String description,
                                         String descriptionAr, BadgeDefinition.Trigger trigger, int threshold) {
        return BadgeDefinition.builder().code(code).title(title).titleAr(titleAr)
                .description(description).descriptionAr(descriptionAr)
                .triggerType(trigger).threshold(threshold).build();
    }
}
