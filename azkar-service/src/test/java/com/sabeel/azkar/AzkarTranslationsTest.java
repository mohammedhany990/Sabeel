package com.sabeel.azkar;

import com.sabeel.azkar.domain.AzkarCategory;
import com.sabeel.azkar.domain.AzkarItem;
import com.sabeel.azkar.repository.AzkarCategoryRepository;
import com.sabeel.azkar.repository.AzkarItemRepository;
import com.sabeel.azkar.seed.AzkarSeeder;
import com.sabeel.azkar.seed.AzkarTranslations;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.*;

class AzkarTranslationsTest {
    @Test
    void everySeededItemPositionHasAnEnglishMeaning() {
        int[][] counts = {{8}, {7}, {6}, {5}};
        String[] codes = {"MORNING", "EVENING", "AFTER_PRAYER", "SLEEP"};
        for (int c = 0; c < codes.length; c++) {
            for (int order = 1; order <= counts[c][0]; order++) {
                assertNotNull(AzkarTranslations.textEn(codes[c], order), codes[c] + ":" + order);
            }
        }
    }

    @Test
    void referencesUsedBySeedAreTranslated() {
        for (String ref : List.of("Bukhari", "Muslim", "An-Nasa'i", "Abu Dawud, Tirmidhi", "Bukhari, Muslim",
                "Al-Baqarah 2:255", "Quran 112", "Quran 113", "Quran 114")) {
            assertNotNull(AzkarTranslations.referenceAr(ref), ref);
        }
        assertNull(AzkarTranslations.referenceAr(null));
    }

    @Test
    void existingDatabasesAreBackfilledOnStartup() throws Exception {
        AzkarCategoryRepository categories = mock(AzkarCategoryRepository.class);
        AzkarItemRepository items = mock(AzkarItemRepository.class);
        when(categories.count()).thenReturn(4L);
        AzkarCategory morning = AzkarCategory.builder().id(1).code("MORNING").nameEn("Morning azkar")
                .nameAr("أذكار الصباح").sortOrder(1).build();
        AzkarItem legacy = AzkarItem.builder().id(1).category(morning).textAr("سُبْحَانَ اللَّهِ وَبِحَمْدِهِ")
                .repeatTarget(100).sortOrder(8).reference("Muslim").build();
        when(items.findAll()).thenReturn(List.of(legacy));
        new AzkarSeeder(categories, items).run();
        assertEquals("Glory be to Allah and praise Him.", legacy.getTextEn());
        assertEquals("مسلم", legacy.getReferenceAr());
        verify(items).saveAll(anyIterable());
    }
}
