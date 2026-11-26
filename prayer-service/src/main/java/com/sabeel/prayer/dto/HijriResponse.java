package com.sabeel.prayer.dto;

public record HijriResponse(String gregorian, String hijri, int hijriYear, int hijriMonth, int hijriDay,
                            String monthName, String note) {
}
