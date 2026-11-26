package com.sabeel.quran.dto;

import java.util.List;

public record SurahTimingsResponse(int reciterId, int surahId, List<AyahTiming> ayahs) {
}
