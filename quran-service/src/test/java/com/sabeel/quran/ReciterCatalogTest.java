package com.sabeel.quran;

import com.sabeel.quran.seed.ReciterCatalog;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReciterCatalogTest {
    private InputStream json(String text) {
        return new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void bundledFileLoadsAllDefaultReciters() throws IOException {
        try (InputStream in = ReciterCatalog.class.getResourceAsStream("/quran/reciters.json")) {
            List<ReciterCatalog.Entry> entries = ReciterCatalog.parse(in);
            assertThat(entries).hasSize(5);
            assertThat(entries).extracting(ReciterCatalog.Entry::key)
                    .containsExactly("alafasy", "husary", "abdul-basit", "minshawi", "sudais");
        }
    }

    @Test
    void parsesAnOwnReciterWithoutSurahFolder() throws IOException {
        List<ReciterCatalog.Entry> entries = ReciterCatalog.parse(json("""
                {"reciters":[{"key":"my-sheikh","nameAr":"الشيخ","nameEn":"My Sheikh","country":"Egypt",
                "style":"Murattal","ayahBaseUrl":"https://audio.example.org/ayah/my-sheikh"}]}
                """));
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).surahBaseUrl()).isNull();
    }

    @Test
    void parsesSurahOnlyReciter() throws IOException {
        List<ReciterCatalog.Entry> entries = ReciterCatalog.parse(json("""
                {"reciters":[{"key":"husary_own","nameAr":"الحصري","nameEn":"Husary Own","country":"Egypt",
                "style":"Murattal","surahBaseUrl":"https://audio.example.org/surah/husary_own"}]}
                """));
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).ayahBaseUrl()).isNull();
        assertThat(entries.get(0).surahBaseUrl()).endsWith("husary_own");
    }

    @Test
    void rejectsReciterWithoutAnyAudioFolder() {
        assertThatThrownBy(() -> ReciterCatalog.parse(json("{\"reciters\":[{\"key\":\"a\",\"nameAr\":\"x\",\"nameEn\":\"y\"}]}")))
                .hasMessageContaining("surahBaseUrl");
    }

    @Test
    void rejectsMissingFieldsBadKeysAndBadUrls() {
        assertThatThrownBy(() -> ReciterCatalog.parse(json("{\"reciters\":[{\"key\":\"a\",\"nameAr\":\"x\"}]}")))
                .hasMessageContaining("nameEn");
        assertThatThrownBy(() -> ReciterCatalog.parse(json("{\"reciters\":[{\"key\":\"Bad Key\",\"nameAr\":\"x\",\"nameEn\":\"y\",\"ayahBaseUrl\":\"https://a.example/x\"}]}")))
                .hasMessageContaining("key");
        assertThatThrownBy(() -> ReciterCatalog.parse(json("{\"reciters\":[{\"key\":\"ok\",\"nameAr\":\"x\",\"nameEn\":\"y\",\"ayahBaseUrl\":\"ftp://a.example/x\"}]}")))
                .hasMessageContaining("http");
    }
}
