package com.sabeel.revision;

import com.sabeel.revision.engine.SpacedRepetitionEngine;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class SpacedRepetitionEngineTest {
    private static final LocalDate DAY = LocalDate.of(2026, 11, 26);

    @Test
    void highAccuracyAdvancesOneLadderStep() {
        var outcome = SpacedRepetitionEngine.review(1, 2.5, 0, 95, DAY);
        assertThat(outcome.intervalDays()).isEqualTo(3);
        assertThat(outcome.nextRevisionDate()).isEqualTo(DAY.plusDays(3));
        assertThat(outcome.difficulty()).isEqualTo("EASY");
        assertThat(outcome.mastered()).isFalse();
    }

    @Test
    void mediumAccuracyRepeatsCurrentStep() {
        var outcome = SpacedRepetitionEngine.review(7, 2.5, 2, 80, DAY);
        assertThat(outcome.intervalDays()).isEqualTo(7);
        assertThat(outcome.difficulty()).isEqualTo("NORMAL");
    }

    @Test
    void lowAccuracyDropsTwoStepsAndResetsRepetitions() {
        var outcome = SpacedRepetitionEngine.review(14, 2.5, 3, 60, DAY);
        assertThat(outcome.intervalDays()).isEqualTo(3);
        assertThat(outcome.repetitions()).isZero();
        assertThat(outcome.difficulty()).isEqualTo("HARD");
    }

    @Test
    void lowAccuracyAtFirstStepStaysAtDayOne() {
        var outcome = SpacedRepetitionEngine.review(1, 2.5, 0, 50, DAY);
        assertThat(outcome.intervalDays()).isEqualTo(1);
    }

    @Test
    void completingTheLadderMastersTheItem() {
        var outcome = SpacedRepetitionEngine.review(60, 2.5, 5, 95, DAY);
        assertThat(outcome.mastered()).isTrue();
        assertThat(outcome.intervalDays()).isGreaterThan(60);
    }

    @Test
    void easeFactorStaysWithinBounds() {
        var outcome = SpacedRepetitionEngine.review(1, 1.3, 0, 0, DAY);
        assertThat(outcome.easeFactor()).isGreaterThanOrEqualTo(1.3);
    }
}
