package com.sabeel.quran.dto;

public record AyahAudioResponse(int reciterId, int surahId, int ayahNumber, String audioUrl) {
}
