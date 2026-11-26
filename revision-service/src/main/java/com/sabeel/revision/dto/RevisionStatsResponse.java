package com.sabeel.revision.dto;

public record RevisionStatsResponse(long dueNow, long scheduled, long mastered) {
}
