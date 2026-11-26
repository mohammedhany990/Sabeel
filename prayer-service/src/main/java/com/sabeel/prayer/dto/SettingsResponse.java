package com.sabeel.prayer.dto;

public record SettingsResponse(double latitude, double longitude, String method, String timezone, int asrFactor) {
}
