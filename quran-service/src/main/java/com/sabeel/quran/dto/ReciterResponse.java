package com.sabeel.quran.dto;

public record ReciterResponse(int id, String nameAr, String nameEn, String country, String style,
                              String countryAr, String styleAr, boolean hasAyahAudio, boolean hasSurahAudio, boolean hasTimings) {
}
