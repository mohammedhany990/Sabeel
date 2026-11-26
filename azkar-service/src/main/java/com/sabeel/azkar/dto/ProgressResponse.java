package com.sabeel.azkar.dto;

public record ProgressResponse(Integer itemId, int count, int repeatTarget, boolean itemDone, boolean categoryComplete) {
}
