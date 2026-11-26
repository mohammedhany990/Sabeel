package com.sabeel.learning.dto;

import java.util.List;

public record CourseResponse(String id, String title, String slug, String description, String teacherId,
                             String category, String thumbnailUrl, String status, List<LessonResponse> lessons,
                             double ratingAvg, int ratingCount) {
    public record LessonResponse(String lessonId, String title, String videoUrl, int durationSec,
                                 String description, int sortOrder) {
    }
}
