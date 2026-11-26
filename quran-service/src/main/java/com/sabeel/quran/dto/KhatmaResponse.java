package com.sabeel.quran.dto;

public record KhatmaResponse(String id, String startDate, String targetDate, int currentPage, int totalPages,
                             int percent, int daysLeft, int pagesPerDay, boolean onTrack, boolean completed,
                             String completedOn) {
}
