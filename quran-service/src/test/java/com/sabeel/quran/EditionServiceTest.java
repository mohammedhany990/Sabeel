package com.sabeel.quran;

import com.sabeel.quran.dto.EditionAyahResponse;
import com.sabeel.quran.exception.ApiException;
import com.sabeel.quran.service.EditionService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EditionServiceTest {
    private final EditionService service = new EditionService();

    @Test
    void listsFiveEditionsWithVersionAndSource() {
        assertEquals(5, service.editions().size());
        service.editions().forEach(e -> {
            assertFalse(e.version().isBlank());
            assertTrue(e.source().startsWith("https://quranenc.com/"));
        });
    }

    @Test
    void everyEditionCoversEveryAyah() {
        for (var e : service.editions()) {
            for (int[] a : new int[][]{{1, 1}, {2, 255}, {114, 6}}) {
                EditionAyahResponse r = service.ayah(e.key(), a[0], a[1]);
                assertFalse(r.entries().isEmpty(), e.key() + " " + a[0] + ":" + a[1]);
            }
        }
    }

    @Test
    void tafsirRangeCoversAyahInsideIt() {
        EditionAyahResponse r = service.ayah("arabic_saadi", 1, 3);
        assertEquals(1, r.entries().get(0).fromAyah());
        assertTrue(r.entries().get(0).toAyah() >= 3);
    }

    @Test
    void englishTranslationKeepsFootnotes() {
        assertNotNull(service.ayah("english_rwwad", 1, 2).entries().get(0).notes());
    }

    @Test
    void unknownEditionIsNotFound() {
        assertThrows(ApiException.class, () -> service.ayah("nope", 1, 1));
    }

    @Test
    void searchFindsArabicTafsirText() {
        var hits = service.search("arabic_moyassar", "الرحمن", 10);
        assertFalse(hits.isEmpty());
        assertTrue(hits.size() <= 10);
        hits.forEach(h -> assertTrue(h.snippet().contains("الرحمن")));
    }

    @Test
    void searchFindsEnglishTranslationIgnoringCase() {
        var hits = service.search("english_rwwad", "MERCIFUL", 5);
        assertFalse(hits.isEmpty());
    }

    @Test
    void shortSearchTextIsRejected() {
        assertThrows(ApiException.class, () -> service.search("arabic_moyassar", "ab", 5));
    }

    @Test
    void unknownEditionIsRejectedForSearch() {
        assertThrows(ApiException.class, () -> service.search("nope", "mercy", 5));
    }
}
