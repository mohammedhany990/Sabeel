package com.sabeel.memorization;

import com.sabeel.memorization.engine.AyahRange;
import com.sabeel.memorization.engine.PlanCalculator;
import com.sabeel.memorization.engine.QuranMeta;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PlanCalculatorTest {

    @Test
    void quranMetaTotalsAreCorrect() {
        int total = 0;
        for (int s = 1; s <= 114; s++) {
            total += QuranMeta.ayahsInSurah(s);
        }
        assertThat(total).isEqualTo(6236);
    }

    @Test
    void fullQuranIn24MonthsNeeds9AyahsPerDay() {
        int daily = PlanCalculator.dailyTarget(1, 1, 114, LocalDate.of(2026, 1, 1), LocalDate.of(2028, 1, 1));
        assertThat(daily).isEqualTo(9);
    }

    @Test
    void startingPointReducesRemaining() {
        int full = QuranMeta.remainingAyahs(1, 1, 114);
        int fromBaqarah = QuranMeta.remainingAyahs(2, 1, 114);
        assertThat(full - fromBaqarah).isEqualTo(7);
    }

    @Test
    void nextRangeStaysWithinSurah() {
        AyahRange range = PlanCalculator.nextRange(114, 1, 9);
        assertThat(range.surahId()).isEqualTo(114);
        assertThat(range.fromAyah()).isEqualTo(1);
        assertThat(range.toAyah()).isEqualTo(6);
    }

    @Test
    void advanceCrossesSurahBoundary() {
        int[] next = PlanCalculator.advance(114, 1, 9, 114);
        assertThat(next[0]).isEqualTo(115);
        assertThat(next[1]).isEqualTo(1);
    }

    @Test
    void rejectsImpossibleTargetDate() {
        assertThatThrownBy(() -> PlanCalculator.dailyTarget(1, 1, 114,
                LocalDate.of(2026, 1, 10), LocalDate.of(2026, 1, 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
