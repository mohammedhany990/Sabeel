package com.sabeel.learning.dto;

public record EnrollmentResponse(String id, String courseId, String courseTitle, String status,
                                 String enrolledAt, int lessonsCompleted, int lessonsTotal) {
}
