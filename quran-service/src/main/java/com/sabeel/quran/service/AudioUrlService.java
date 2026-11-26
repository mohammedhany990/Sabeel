package com.sabeel.quran.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AudioUrlService {
    private final String ayahOverride;
    private final String surahOverride;

    public AudioUrlService() {
        this("", "");
    }

    @Autowired
    public AudioUrlService(@Value("${quran.audio.ayah-base-url:}") String ayahOverride,
                           @Value("${quran.audio.surah-base-url:}") String surahOverride) {
        this.ayahOverride = trimSlash(ayahOverride);
        this.surahOverride = trimSlash(surahOverride);
    }

    public String ayahAudioUrl(String audioBaseUrl, int surah, int ayah) {
        return String.format("%s/%03d%03d.mp3", effectiveBase(ayahOverride, audioBaseUrl), surah, ayah);
    }

    public String surahAudioUrl(String fullAudioBaseUrl, int surah) {
        return String.format("%s/%03d.mp3", effectiveBase(surahOverride, fullAudioBaseUrl), surah);
    }

    private String effectiveBase(String override, String defaultBase) {
        if (override.isEmpty() || !isPublicDefaultHost(defaultBase)) {
            return defaultBase;
        }
        String clean = trimSlash(defaultBase);
        return override + clean.substring(clean.lastIndexOf('/'));
    }

    private boolean isPublicDefaultHost(String base) {
        return base != null && (base.contains("//everyayah.com/") || base.contains("//download.quranicaudio.com/"));
    }

    private String trimSlash(String value) {
        if (value == null) {
            return "";
        }
        String v = value.trim();
        while (v.endsWith("/")) {
            v = v.substring(0, v.length() - 1);
        }
        return v;
    }
}
