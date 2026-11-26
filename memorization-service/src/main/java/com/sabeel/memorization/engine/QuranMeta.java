package com.sabeel.memorization.engine;

public final class QuranMeta {
    public static final int TOTAL_AYAHS = 6236;
    public static final int TOTAL_SURAHS = 114;

    private static final int[] AYAH_COUNTS = {
            0,
            7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
            123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
            112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
            34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
            54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
            60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
            14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
            28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
            29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
            15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
            11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
            5, 4, 5, 6};

    private QuranMeta() {
    }

    public static int ayahsInSurah(int surahId) {
        return AYAH_COUNTS[surahId];
    }

    public static int remainingAyahs(int fromSurah, int fromAyah, int toSurah) {
        int total = 0;
        for (int s = fromSurah; s <= toSurah; s++) {
            total += AYAH_COUNTS[s];
        }
        return total - (fromAyah - 1);
    }
}
