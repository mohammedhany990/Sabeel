package com.sabeel.azkar.dto;

public record ItemResponse(Integer id, String textAr, int repeatTarget, String reference, int todayCount, boolean done,
                           String textEn, String referenceAr) {
}
