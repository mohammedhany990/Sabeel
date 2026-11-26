package com.sabeel.prayer;

import com.sabeel.prayer.engine.HijriCalendar;
import com.sabeel.prayer.engine.QiblaCalculator;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class QiblaHijriTest {
    private final QiblaCalculator qibla = new QiblaCalculator();
    private final HijriCalendar hijri = new HijriCalendar();

    @Test
    void qiblaFromCairoPointsSouthEast() {
        double bearing = qibla.bearingDegrees(30.0444, 31.2357);
        assertTrue(bearing > 130 && bearing < 142, "Cairo qibla bearing was " + bearing);
    }

    @Test
    void qiblaFromJakartaPointsNorthWest() {
        double bearing = qibla.bearingDegrees(-6.2088, 106.8456);
        assertTrue(bearing > 290 && bearing < 300, "Jakarta qibla bearing was " + bearing);
    }

    @Test
    void hijriGregorianRoundTripPreservesDate() {
        for (LocalDate date : new LocalDate[]{LocalDate.of(2026, 11, 26), LocalDate.of(2026, 3, 1), LocalDate.of(2002, 10, 16)}) {
            HijriCalendar.HijriDate h = hijri.toHijri(date);
            assertEquals(date, hijri.toGregorian(h.year(), h.month(), h.day()));
            assertTrue(h.year() >= 1400 && h.year() <= 1500);
            assertTrue(h.month() >= 1 && h.month() <= 12);
        }
    }

    @Test
    void ramadan1447StartsAroundMidFebruary2026() {
        LocalDate ramadan1 = hijri.toGregorian(1447, 9, 1);
        assertTrue(ramadan1.isAfter(LocalDate.of(2026, 2, 14)) && ramadan1.isBefore(LocalDate.of(2026, 2, 23)),
                "1 Ramadan 1447 tabular date was " + ramadan1);
    }
}
