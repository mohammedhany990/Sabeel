package com.sabeel.quran.dto;

public record SurahResponse(int id, String nameAr, String nameEn, String transliteration,
                            String revelationType, int ayahCount, Integer startPage, Integer startJuz) {
}
