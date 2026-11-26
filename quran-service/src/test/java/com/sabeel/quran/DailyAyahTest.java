package com.sabeel.quran;

import com.sabeel.quran.service.QuranService;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class DailyAyahTest {
    @Test
    void idIsStableAndInRange() {
        LocalDate day = LocalDate.of(2026, 11, 26);
        assertEquals(QuranService.dailyAyahId(day), QuranService.dailyAyahId(day));
        for (int i = 0; i < 2000; i++) {
            int id = QuranService.dailyAyahId(day.plusDays(i));
            assertTrue(id >= 1 && id <= 6236);
        }
    }

    @Test
    void consecutiveDaysSpreadAcrossTheQuran() {
        Set<Integer> seen = new HashSet<>();
        for (int i = 0; i < 365; i++) {
            seen.add(QuranService.dailyAyahId(LocalDate.of(2026, 1, 1).plusDays(i)));
        }
        assertTrue(seen.size() > 300);
    }
}
