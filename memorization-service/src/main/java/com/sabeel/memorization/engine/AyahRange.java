package com.sabeel.memorization.engine;

public record AyahRange(int surahId, int fromAyah, int toAyah) {
    public int size() {
        return toAyah - fromAyah + 1;
    }
}
