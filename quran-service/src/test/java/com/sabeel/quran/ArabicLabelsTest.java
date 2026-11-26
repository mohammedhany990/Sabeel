package com.sabeel.quran;

import com.sabeel.quran.service.ArabicLabels;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ArabicLabelsTest {
    @Test
    void revelationTypesAreTranslated() {
        assertEquals("مكية", ArabicLabels.revelationType("MAKKI"));
        assertEquals("مدنية", ArabicLabels.revelationType("MADANI"));
        assertEquals("OTHER", ArabicLabels.revelationType("OTHER"));
        assertNull(ArabicLabels.revelationType(null));
    }

    @Test
    void seededReciterCountriesAndStylesAreTranslated() {
        assertEquals("الكويت", ArabicLabels.country("Kuwait"));
        assertEquals("مصر", ArabicLabels.country("Egypt"));
        assertEquals("المملكة العربية السعودية", ArabicLabels.country("Saudi Arabia"));
        assertEquals("مرتل", ArabicLabels.style("Murattal"));
        assertEquals("Elsewhere", ArabicLabels.country("Elsewhere"));
    }
}
