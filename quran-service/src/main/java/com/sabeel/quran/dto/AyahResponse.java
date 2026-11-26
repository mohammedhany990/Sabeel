package com.sabeel.quran.dto;

public record AyahResponse(int id, int surahId, int ayahNumber, String textUthmani, String textSimple,
                           Integer page, Integer juz, Integer hizb) {
}
