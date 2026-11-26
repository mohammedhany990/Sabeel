package com.sabeel.prayer.engine;

public enum CalculationMethod {
    MWL(18.0, 17.0, 0),
    ISNA(15.0, 15.0, 0),
    EGYPT(19.5, 17.5, 0),
    MAKKAH(18.5, 0, 90),
    KARACHI(18.0, 18.0, 0);

    private final double fajrAngle;
    private final double ishaAngle;
    private final int ishaIntervalMinutes;

    CalculationMethod(double fajrAngle, double ishaAngle, int ishaIntervalMinutes) {
        this.fajrAngle = fajrAngle;
        this.ishaAngle = ishaAngle;
        this.ishaIntervalMinutes = ishaIntervalMinutes;
    }

    public double fajrAngle() { return fajrAngle; }
    public double ishaAngle() { return ishaAngle; }
    public int ishaIntervalMinutes() { return ishaIntervalMinutes; }
}
