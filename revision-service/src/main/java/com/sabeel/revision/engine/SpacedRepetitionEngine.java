package com.sabeel.revision.engine;

import java.time.LocalDate;

public final class SpacedRepetitionEngine {
    public static final int[] LADDER = {1, 3, 7, 14, 30, 60};
    public static final double MIN_EASE = 1.3;
    public static final double MAX_EASE = 3.0;

    private SpacedRepetitionEngine() {
    }

    public record ReviewOutcome(int intervalDays, double easeFactor, int repetitions, String difficulty,
                                boolean mastered, LocalDate nextRevisionDate) {
    }

    public static ReviewOutcome review(int currentIntervalDays, double easeFactor, int repetitions,
                                       double accuracy, LocalDate reviewDate) {
        double quality = accuracy / 20.0;
        double newEase = clamp(easeFactor + (0.1 - (5 - quality) * 0.08), MIN_EASE, MAX_EASE);

        int ladderIndex = ladderIndex(currentIntervalDays);
        int newInterval;
        int newRepetitions = repetitions + 1;
        String difficulty;

        if (accuracy >= 90) {
            difficulty = "EASY";
            if (ladderIndex < LADDER.length - 1) {
                newInterval = LADDER[ladderIndex + 1];
            } else {
                newInterval = (int) Math.round(LADDER[LADDER.length - 1] * newEase);
                return new ReviewOutcome(newInterval, newEase, newRepetitions, difficulty, true,
                        reviewDate.plusDays(newInterval));
            }
        } else if (accuracy >= 70) {
            difficulty = "NORMAL";
            newInterval = LADDER[ladderIndex];
        } else {
            difficulty = "HARD";
            newInterval = LADDER[Math.max(0, ladderIndex - 2)];
            newRepetitions = 0;
        }

        return new ReviewOutcome(newInterval, newEase, newRepetitions, difficulty, false,
                reviewDate.plusDays(newInterval));
    }

    private static int ladderIndex(int intervalDays) {
        int best = 0;
        for (int i = 0; i < LADDER.length; i++) {
            if (LADDER[i] <= intervalDays) {
                best = i;
            }
        }
        return best;
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
