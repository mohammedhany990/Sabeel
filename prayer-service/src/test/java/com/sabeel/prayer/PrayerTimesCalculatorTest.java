package com.sabeel.prayer;

import com.sabeel.prayer.engine.CalculationMethod;
import com.sabeel.prayer.engine.PrayerName;
import com.sabeel.prayer.engine.PrayerTimesCalculator;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class PrayerTimesCalculatorTest {
    private final PrayerTimesCalculator calculator = new PrayerTimesCalculator();
    private static final ZoneId CAIRO = ZoneId.of("Africa/Cairo");

    @Test
    void cairoNovemberTimesAreOrderedAndPlausible() {
        Map<PrayerName, ZonedDateTime> times = calculator.compute(
                LocalDate.of(2026, 11, 26), 30.0444, 31.2357, CAIRO, CalculationMethod.EGYPT, 1);
        ZonedDateTime fajr = times.get(PrayerName.FAJR);
        ZonedDateTime sunrise = times.get(PrayerName.SUNRISE);
        ZonedDateTime dhuhr = times.get(PrayerName.DHUHR);
        ZonedDateTime asr = times.get(PrayerName.ASR);
        ZonedDateTime maghrib = times.get(PrayerName.MAGHRIB);
        ZonedDateTime isha = times.get(PrayerName.ISHA);
        assertTrue(fajr.isBefore(sunrise) && sunrise.isBefore(dhuhr) && dhuhr.isBefore(asr)
                && asr.isBefore(maghrib) && maghrib.isBefore(isha));
        assertBetween(fajr, 4, 30, 5, 30);
        assertBetween(dhuhr, 11, 30, 12, 15);
        assertBetween(asr, 14, 15, 15, 15);
        assertBetween(maghrib, 16, 30, 17, 15);
        assertBetween(isha, 17, 45, 18, 45);
        assertEquals(CAIRO, fajr.getZone());
    }

    @Test
    void makkahMethodUsesIshaIntervalAfterMaghrib() {
        Map<PrayerName, ZonedDateTime> times = calculator.compute(
                LocalDate.of(2026, 11, 26), 21.4225, 39.8262, ZoneId.of("Asia/Riyadh"), CalculationMethod.MAKKAH, 1);
        long minutes = java.time.Duration.between(times.get(PrayerName.MAGHRIB), times.get(PrayerName.ISHA)).toMinutes();
        assertEquals(90, minutes);
    }

    @Test
    void hanafiAsrIsLaterThanStandardAsr() {
        LocalDate date = LocalDate.of(2026, 6, 21);
        Map<PrayerName, ZonedDateTime> standard = calculator.compute(date, 30.0444, 31.2357, CAIRO, CalculationMethod.EGYPT, 1);
        Map<PrayerName, ZonedDateTime> hanafi = calculator.compute(date, 30.0444, 31.2357, CAIRO, CalculationMethod.EGYPT, 2);
        assertTrue(hanafi.get(PrayerName.ASR).isAfter(standard.get(PrayerName.ASR)));
    }

    private void assertBetween(ZonedDateTime t, int h1, int m1, int h2, int m2) {
        int minutes = t.getHour() * 60 + t.getMinute();
        assertTrue(minutes >= h1 * 60 + m1 && minutes <= h2 * 60 + m2,
                t + " not between " + h1 + ":" + m1 + " and " + h2 + ":" + m2);
    }
}
