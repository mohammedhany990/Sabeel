package com.sabeel.memorization.engine;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class PlanCalculator {

    private PlanCalculator() {
    }

    public static int dailyTarget(int fromSurah, int fromAyah, int toSurah, LocalDate startDate, LocalDate targetDate) {
        long days = ChronoUnit.DAYS.between(startDate, targetDate);
        if (days <= 0) {
            throw new IllegalArgumentException("target date must be after start date");
        }
        int remaining = QuranMeta.remainingAyahs(fromSurah, fromAyah, toSurah);
        return (int) Math.ceil((double) remaining / days);
    }

    public static AyahRange nextRange(int currentSurah, int currentAyah, int count) {
        int end = Math.min(currentAyah + count - 1, QuranMeta.ayahsInSurah(currentSurah));
        return new AyahRange(currentSurah, currentAyah, end);
    }

    public static int[] advance(int currentSurah, int currentAyah, int count, int targetSurah) {
        int surah = currentSurah;
        int ayah = currentAyah;
        int left = count;
        while (left > 0 && surah <= targetSurah) {
            int inSurah = QuranMeta.ayahsInSurah(surah) - ayah + 1;
            if (left < inSurah) {
                ayah += left;
                left = 0;
            } else {
                left -= inSurah;
                surah++;
                ayah = 1;
            }
        }
        return new int[]{surah, ayah};
    }
}
