package com.sabeel.quran;

import com.sabeel.quran.domain.Ayah;
import com.sabeel.quran.domain.Surah;
import com.sabeel.quran.seed.FullQuranLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FullQuranLoaderTest {
    private final FullQuranLoader.Loaded loaded = new FullQuranLoader().load();

    @Test
    void loadsAllSurahsAndAyahs() {
        assertThat(loaded.surahs()).hasSize(114);
        assertThat(loaded.ayahs()).hasSize(6236);
        int total = loaded.surahs().stream().mapToInt(Surah::getAyahCount).sum();
        assertThat(total).isEqualTo(6236);
    }

    @Test
    void firstAndLastAyahCarryExpectedMetadata() {
        Ayah first = loaded.ayahs().get(0);
        assertThat(first.getSurahId()).isEqualTo(1);
        assertThat(first.getAyahNumber()).isEqualTo(1);
        assertThat(first.getPage()).isEqualTo(1);
        assertThat(first.getJuz()).isEqualTo(1);
        assertThat(first.getTextSimple()).isEqualTo("بسم الله الرحمن الرحيم");
        Ayah last = loaded.ayahs().get(6235);
        assertThat(last.getId()).isEqualTo(6236);
        assertThat(last.getSurahId()).isEqualTo(114);
        assertThat(last.getAyahNumber()).isEqualTo(6);
        assertThat(last.getPage()).isEqualTo(604);
        assertThat(last.getJuz()).isEqualTo(30);
        assertThat(last.getHizb()).isEqualTo(60);
    }

    @Test
    void everyAyahHasTextAndMetadata() {
        assertThat(loaded.ayahs()).allSatisfy(a -> {
            assertThat(a.getTextUthmani()).isNotBlank();
            assertThat(a.getTextSimple()).isNotBlank();
            assertThat(a.getPage()).isBetween(1, 604);
            assertThat(a.getJuz()).isBetween(1, 30);
            assertThat(a.getHizb()).isBetween(1, 60);
        });
    }
}
