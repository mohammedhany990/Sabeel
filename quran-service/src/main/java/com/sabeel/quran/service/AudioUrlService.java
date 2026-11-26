package com.sabeel.quran.service;

import org.springframework.stereotype.Service;

@Service
public class AudioUrlService {
    public String ayahAudioUrl(String audioBaseUrl, int surah, int ayah) {
        return String.format("%s/%03d%03d.mp3", audioBaseUrl, surah, ayah);
    }

    public String surahAudioUrl(String fullAudioBaseUrl, int surah) {
        return String.format("%s/%03d.mp3", fullAudioBaseUrl, surah);
    }
}
