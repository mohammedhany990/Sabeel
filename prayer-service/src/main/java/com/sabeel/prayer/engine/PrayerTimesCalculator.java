package com.sabeel.prayer.engine;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.EnumMap;
import java.util.Map;

@Component
public class PrayerTimesCalculator {

    public Map<PrayerName, ZonedDateTime> compute(LocalDate date, double latitude, double longitude,
                                                  ZoneId zone, CalculationMethod method, int asrFactor) {
        double jd = julian(date.getYear(), date.getMonthValue(), date.getDayOfMonth()) - longitude / (15.0 * 24.0);
        Map<PrayerName, ZonedDateTime> result = new EnumMap<>(PrayerName.class);
        double fajr = sunAngleTime(jd, latitude, method.fajrAngle(), 5.0 / 24.0, true);
        double sunrise = sunAngleTime(jd, latitude, 0.833, 6.0 / 24.0, true);
        double dhuhr = midDay(jd, 12.0 / 24.0);
        double asr = asrTime(jd, latitude, asrFactor, 13.0 / 24.0);
        double maghrib = sunAngleTime(jd, latitude, 0.833, 18.0 / 24.0, false);
        double isha = method.ishaIntervalMinutes() > 0
                ? maghrib + method.ishaIntervalMinutes() / 60.0
                : sunAngleTime(jd, latitude, method.ishaAngle(), 18.0 / 24.0, false);
        double offsetHours = ZonedDateTime.of(date, LocalTime.NOON, zone).getOffset().getTotalSeconds() / 3600.0;
        result.put(PrayerName.FAJR, toZoned(date, fajr, longitude, zone, offsetHours));
        result.put(PrayerName.SUNRISE, toZoned(date, sunrise, longitude, zone, offsetHours));
        result.put(PrayerName.DHUHR, toZoned(date, dhuhr, longitude, zone, offsetHours));
        result.put(PrayerName.ASR, toZoned(date, asr, longitude, zone, offsetHours));
        result.put(PrayerName.MAGHRIB, toZoned(date, maghrib, longitude, zone, offsetHours));
        result.put(PrayerName.ISHA, toZoned(date, isha, longitude, zone, offsetHours));
        return result;
    }

    private ZonedDateTime toZoned(LocalDate date, double hourUtcAtLongitude, double longitude, ZoneId zone, double offsetHours) {
        double localHour = fixHour(hourUtcAtLongitude - longitude / 15.0 + offsetHours);
        int hour = (int) localHour;
        double minuteF = (localHour - hour) * 60.0;
        int minute = (int) minuteF;
        int second = (int) Math.round((minuteF - minute) * 60.0);
        if (second == 60) { second = 0; minute += 1; }
        if (minute == 60) { minute = 0; hour += 1; }
        LocalDate d = date;
        if (hour >= 24) { hour -= 24; d = date.plusDays(1); }
        return ZonedDateTime.of(d, LocalTime.of(hour, minute, second), zone);
    }

    private double midDay(double jd, double t) {
        return fixHour(12.0 - equationOfTime(jd + t));
    }

    private double sunAngleTime(double jd, double latitude, double angle, double t, boolean beforeNoon) {
        double decl = declination(jd + t);
        double noon = midDay(jd, t);
        double cosH = (-sinDeg(angle) - sinDeg(decl) * sinDeg(latitude))
                / (cosDeg(decl) * cosDeg(latitude));
        if (cosH > 1.0 || cosH < -1.0) {
            throw new IllegalArgumentException("sun does not reach the required angle at this location and date");
        }
        double delta = Math.toDegrees(Math.acos(cosH)) / 15.0;
        return noon + (beforeNoon ? -delta : delta);
    }

    private double asrTime(double jd, double latitude, int factor, double t) {
        double decl = declination(jd + t);
        double angle = -Math.toDegrees(Math.atan(1.0 / (factor + Math.tan(Math.toRadians(Math.abs(latitude - decl))))));
        return sunAngleTime(jd, latitude, angle, t, false);
    }

    private double equationOfTime(double jd) {
        double d = jd - 2451545.0;
        double g = fixAngle(357.529 + 0.98560028 * d);
        double q = fixAngle(280.459 + 0.98564736 * d);
        double l = fixAngle(q + 1.915 * sinDeg(g) + 0.020 * sinDeg(2 * g));
        double e = 23.439 - 0.00000036 * d;
        double ra = Math.toDegrees(Math.atan2(cosDeg(e) * sinDeg(l), cosDeg(l))) / 15.0;
        return q / 15.0 - fixHour(ra);
    }

    private double declination(double jd) {
        double d = jd - 2451545.0;
        double g = fixAngle(357.529 + 0.98560028 * d);
        double q = fixAngle(280.459 + 0.98564736 * d);
        double l = fixAngle(q + 1.915 * sinDeg(g) + 0.020 * sinDeg(2 * g));
        double e = 23.439 - 0.00000036 * d;
        return Math.toDegrees(Math.asin(sinDeg(e) * sinDeg(l)));
    }

    private double julian(int year, int month, int day) {
        if (month <= 2) {
            year -= 1;
            month += 12;
        }
        int a = year / 100;
        int b = 2 - a + a / 4;
        return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
    }

    private static double sinDeg(double deg) { return Math.sin(Math.toRadians(deg)); }
    private static double cosDeg(double deg) { return Math.cos(Math.toRadians(deg)); }
    private static double fixAngle(double a) { return a - 360.0 * Math.floor(a / 360.0); }
    private static double fixHour(double h) { return h - 24.0 * Math.floor(h / 24.0); }
}
