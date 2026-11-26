package com.sabeel.prayer.engine;

import org.springframework.stereotype.Component;

@Component
public class QiblaCalculator {
    private static final double KAABA_LAT = 21.4225;
    private static final double KAABA_LNG = 39.8262;

    public double bearingDegrees(double latitude, double longitude) {
        double lat1 = Math.toRadians(latitude);
        double lat2 = Math.toRadians(KAABA_LAT);
        double dLng = Math.toRadians(KAABA_LNG - longitude);
        double y = Math.sin(dLng);
        double x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLng);
        double bearing = Math.toDegrees(Math.atan2(y, x));
        return (bearing + 360.0) % 360.0;
    }
}
