package com.sabeel.azkar.dto;

import java.util.Map;

public record TasbeehResponse(String date, Map<String, Long> today, Map<String, Long> lifetime) {
}
