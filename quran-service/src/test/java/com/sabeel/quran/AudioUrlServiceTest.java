package com.sabeel.quran;

import com.sabeel.quran.service.AudioUrlService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AudioUrlServiceTest {
    private final AudioUrlService service = new AudioUrlService();

    @Test
    void buildsEveryAyahStyleUrl() {
        assertThat(service.ayahAudioUrl("https://everyayah.com/data/Alafasy_128kbps", 1, 1))
                .isEqualTo("https://everyayah.com/data/Alafasy_128kbps/001001.mp3");
        assertThat(service.ayahAudioUrl("https://everyayah.com/data/Husary_128kbps", 114, 6))
                .isEqualTo("https://everyayah.com/data/Husary_128kbps/114006.mp3");
        assertThat(service.ayahAudioUrl("https://everyayah.com/data/Husary_128kbps", 2, 255))
                .isEqualTo("https://everyayah.com/data/Husary_128kbps/002255.mp3");
    }

    @Test
    void fullSurahUrlFollowsTheVerifiedQuranicaudioPattern() {
        assertThat(service.surahAudioUrl("https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee", 1))
                .isEqualTo("https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/001.mp3");
        assertThat(service.surahAudioUrl("https://download.quranicaudio.com/quran/abdul_basit_murattal", 114))
                .isEqualTo("https://download.quranicaudio.com/quran/abdul_basit_murattal/114.mp3");
    }
}
