package com.sabeel.prayer.engine;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class HijriCalendar {
    private static final long ISLAMIC_EPOCH = 1948440;
    private static final List<String> MONTH_NAMES = List.of(
            "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
            "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban",
            "Ramadan", "Shawwal", "Dhul-Qa'dah", "Dhul-Hijjah");

    public record HijriDate(int year, int month, int day, String monthName) {
        public String formatted() {
            return day + " " + monthName + " " + year + " AH";
        }
    }

    public HijriDate toHijri(LocalDate date) {
        long jd = gregorianToJd(date.getYear(), date.getMonthValue(), date.getDayOfMonth());
        int year = (int) Math.floor((30.0 * (jd - ISLAMIC_EPOCH) + 10646.0) / 10631.0);
        int month = (int) Math.min(12, Math.ceil((jd - (29 + islamicToJd(year, 1, 1))) / 29.5) + 1);
        int day = (int) (jd - islamicToJd(year, month, 1) + 1);
        return new HijriDate(year, month, day, MONTH_NAMES.get(month - 1));
    }

    public LocalDate toGregorian(int year, int month, int day) {
        long jd = islamicToJd(year, month, day);
        long l = jd + 68569;
        long n = (4 * l) / 146097;
        l = l - (146097 * n + 3) / 4;
        long i = (4000 * (l + 1)) / 1461001;
        l = l - (1461 * i) / 4 + 31;
        long j = (80 * l) / 2447;
        int d = (int) (l - (2447 * j) / 80);
        l = j / 11;
        int m = (int) (j + 2 - 12 * l);
        int y = (int) (100 * (n - 49) + i + l);
        return LocalDate.of(y, m, d);
    }

    private long islamicToJd(int year, int month, int day) {
        return day + (long) Math.ceil(29.5 * (month - 1)) + (long) (year - 1) * 354
                + (3 + 11L * year) / 30 + ISLAMIC_EPOCH - 1;
    }

    private long gregorianToJd(int year, int month, int day) {
        int a = (14 - month) / 12;
        int y = year + 4800 - a;
        int m = month + 12 * a - 3;
        return day + (153L * m + 2) / 5 + 365L * y + y / 4 - y / 100 + y / 400 - 32045;
    }
}
