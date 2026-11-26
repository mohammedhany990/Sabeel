package com.sabeel.quran.service;

import java.util.Map;

public final class ArabicLabels {
    private static final Map<String, String> REVELATION = Map.of("MAKKI", "مكية", "MADANI", "مدنية");
    private static final Map<String, String> COUNTRY = Map.of(
            "Kuwait", "الكويت", "Egypt", "مصر", "Saudi Arabia", "المملكة العربية السعودية",
            "UAE", "الإمارات العربية المتحدة", "Qatar", "قطر", "Morocco", "المغرب", "Yemen", "اليمن");
    private static final Map<String, String> STYLE = Map.of("Murattal", "مرتل", "Mujawwad", "مجوّد", "Muallim", "معلّم");

    private ArabicLabels() {
    }

    public static String revelationType(String value) {
        return value == null ? null : REVELATION.getOrDefault(value.toUpperCase(), value);
    }

    public static String country(String value) {
        return value == null ? null : COUNTRY.getOrDefault(value, value);
    }

    public static String style(String value) {
        return value == null ? null : STYLE.getOrDefault(value, value);
    }
}
