package com.sabeel.community.service;

import com.sabeel.community.domain.BadgeDefinition;
import com.sabeel.community.dto.BadgeResponse;
import com.sabeel.community.repository.BadgeDefinitionRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BadgeSeederTest {
    @Test
    void everyDefaultBadgeHasArabicTitleAndDescription() {
        for (BadgeDefinition badge : BadgeSeeder.defaults()) {
            assertNotNull(badge.getTitleAr(), badge.getCode());
            assertNotNull(badge.getDescriptionAr(), badge.getCode());
            assertTrue(badge.getTitleAr().chars().anyMatch(c -> c >= 0x0600 && c <= 0x06FF), badge.getCode());
        }
    }

    @Test
    void existingEnglishOnlyBadgesAreBackfilledWithArabic() {
        BadgeDefinitionRepository repository = mock(BadgeDefinitionRepository.class);
        BadgeDefinition legacy = BadgeDefinition.builder().code("first-task").title("First Step")
                .triggerType(BadgeDefinition.Trigger.TASKS_COMPLETED).threshold(1).build();
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.findById("first-task")).thenReturn(Optional.of(legacy));
        new BadgeSeeder(repository).run();
        assertEquals("الخطوة الأولى", legacy.getTitleAr());
        assertEquals("First Step", legacy.getTitle());
        verify(repository, times(6)).save(any(BadgeDefinition.class));
    }

    @Test
    void definitionResponseExposesBothLanguages() {
        BadgeDefinition badge = BadgeSeeder.defaults().get(0);
        BadgeResponse response = BadgeResponse.definition(badge);
        assertEquals("First Step", response.title());
        assertEquals("الخطوة الأولى", response.titleAr());
        assertEquals("أكمل أول مهمة حفظ لك", response.descriptionAr());
    }
}
