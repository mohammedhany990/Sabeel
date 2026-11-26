package com.sabeel.learning.dto;

public record ProgressResponse(String enrollmentId, String lessonId, int watchedSeconds, boolean completed) {
}
