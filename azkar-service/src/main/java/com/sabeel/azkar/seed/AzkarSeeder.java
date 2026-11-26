package com.sabeel.azkar.seed;

import com.sabeel.azkar.domain.AzkarCategory;
import com.sabeel.azkar.domain.AzkarItem;
import com.sabeel.azkar.repository.AzkarCategoryRepository;
import com.sabeel.azkar.repository.AzkarItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AzkarSeeder implements CommandLineRunner {
    private final AzkarCategoryRepository categoryRepository;
    private final AzkarItemRepository itemRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (categoryRepository.count() > 0) {
            backfillTranslations();
            return;
        }
        log.info("seeding azkar content");
        AzkarCategory morning = category("MORNING", "Morning azkar", "أذكار الصباح", 1);
        AzkarCategory evening = category("EVENING", "Evening azkar", "أذكار المساء", 2);
        AzkarCategory afterPrayer = category("AFTER_PRAYER", "After-prayer azkar", "أذكار بعد الصلاة", 3);
        AzkarCategory sleep = category("SLEEP", "Sleep azkar", "أذكار النوم", 4);

        itemRepository.saveAll(List.of(
                item(morning, 1, "آيَةُ الْكُرْسِيِّ: اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ... [البقرة 255]", 1, "Al-Baqarah 2:255"),
                item(morning, 2, "سُورَةُ الْإِخْلَاصِ: قُلْ هُوَ اللَّهُ أَحَدٌ...", 3, "Quran 112"),
                item(morning, 3, "سُورَةُ الْفَلَقِ: قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ...", 3, "Quran 113"),
                item(morning, 4, "سُورَةُ النَّاسِ: قُلْ أَعُوذُ بِرَبِّ النَّاسِ...", 3, "Quran 114"),
                item(morning, 5, "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", 1, "Muslim"),
                item(morning, 6, "سَيِّدُ الِاسْتِغْفَارِ: اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ...", 1, "Bukhari"),
                item(morning, 7, "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", 3, "Abu Dawud, Tirmidhi"),
                item(morning, 8, "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", 100, "Muslim"),

                item(evening, 1, "آيَةُ الْكُرْسِيِّ [البقرة 255]", 1, "Al-Baqarah 2:255"),
                item(evening, 2, "سُورَةُ الْإِخْلَاصِ", 3, "Quran 112"),
                item(evening, 3, "سُورَةُ الْفَلَقِ", 3, "Quran 113"),
                item(evening, 4, "سُورَةُ النَّاسِ", 3, "Quran 114"),
                item(evening, 5, "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", 1, "Muslim"),
                item(evening, 6, "سَيِّدُ الِاسْتِغْفَارِ", 1, "Bukhari"),
                item(evening, 7, "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", 3, "Muslim"),

                item(afterPrayer, 1, "أَسْتَغْفِرُ اللَّهَ (ثلاثًا)، اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", 1, "Muslim"),
                item(afterPrayer, 2, "سُبْحَانَ اللَّهِ", 33, "Muslim"),
                item(afterPrayer, 3, "الْحَمْدُ لِلَّهِ", 33, "Muslim"),
                item(afterPrayer, 4, "اللَّهُ أَكْبَرُ", 34, "Muslim"),
                item(afterPrayer, 5, "آيَةُ الْكُرْسِيِّ [البقرة 255]", 1, "An-Nasa'i"),
                item(afterPrayer, 6, "لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", 1, "Muslim"),

                item(sleep, 1, "آيَةُ الْكُرْسِيِّ [البقرة 255]", 1, "Bukhari"),
                item(sleep, 2, "سُورَةُ الْإِخْلَاصِ وَالْمُعَوِّذَتَيْنِ", 3, "Bukhari"),
                item(sleep, 3, "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", 1, "Bukhari"),
                item(sleep, 4, "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ", 3, "Abu Dawud, Tirmidhi"),
                item(sleep, 5, "سُبْحَانَ اللَّهِ (33) وَالْحَمْدُ لِلَّهِ (33) وَاللَّهُ أَكْبَرُ (34)", 33, "Bukhari, Muslim")));
        backfillTranslations();
        log.info("seeded {} azkar items in {} categories", itemRepository.count(), categoryRepository.count());
    }

    void backfillTranslations() {
        List<AzkarItem> changed = new java.util.ArrayList<>();
        for (AzkarItem item : itemRepository.findAll()) {
            boolean dirty = false;
            if (item.getTextEn() == null) {
                String en = AzkarTranslations.textEn(item.getCategory().getCode(), item.getSortOrder());
                if (en != null) {
                    item.setTextEn(en);
                    dirty = true;
                }
            }
            if (item.getReferenceAr() == null) {
                String ar = AzkarTranslations.referenceAr(item.getReference());
                if (ar != null) {
                    item.setReferenceAr(ar);
                    dirty = true;
                }
            }
            if (dirty) {
                changed.add(item);
            }
        }
        itemRepository.saveAll(changed);
    }

    private AzkarCategory category(String code, String en, String ar, int order) {
        return categoryRepository.save(AzkarCategory.builder().code(code).nameEn(en).nameAr(ar).sortOrder(order).build());
    }

    private AzkarItem item(AzkarCategory category, int order, String textAr, int target, String reference) {
        return AzkarItem.builder().category(category).sortOrder(order).textAr(textAr).repeatTarget(target).reference(reference).build();
    }
}
