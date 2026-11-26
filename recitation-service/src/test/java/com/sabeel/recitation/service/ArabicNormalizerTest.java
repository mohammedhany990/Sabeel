package com.sabeel.recitation.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ArabicNormalizerTest {
    private final ArabicNormalizer normalizer = new ArabicNormalizer();

    @Test
    void stripsDiacritics() {
        assertEquals("بسم الله", normalizer.normalize("بِسْمِ اللَّهِ"));
    }

    @Test
    void normalizesAlefVariants() {
        assertEquals("الله ابراهيم", normalizer.normalize("ٱلله إبراهيم"));
        assertEquals("امن", normalizer.normalize("آمن"));
        assertEquals("احمد", normalizer.normalize("أحمد"));
    }

    @Test
    void normalizesTaaMarbutaAndAlefMaqsura() {
        assertEquals("رحمه", normalizer.normalize("رحمة"));
        assertEquals("هدي", normalizer.normalize("هدى"));
    }

    @Test
    void removesTatweelAndPunctuation() {
        assertEquals("بسم الله", normalizer.normalize("بسم ﴿الله﴾،"));
        assertEquals("الكلام", normalizer.normalize("الكـــلام"));
    }

    @Test
    void tokensSplitOnWhitespace() {
        assertEquals(List.of("قل", "هو"), normalizer.tokens("قُلْ  هُوَ"));
    }

    @Test
    void nullAndBlankNormalizeToEmpty() {
        assertEquals("", normalizer.normalize(null));
        assertEquals("", normalizer.normalize("   "));
        assertTrue(normalizer.tokens(null).isEmpty());
    }
}
