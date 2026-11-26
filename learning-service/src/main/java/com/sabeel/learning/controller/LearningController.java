package com.sabeel.learning.controller;

import com.sabeel.learning.dto.CourseRequest;
import com.sabeel.learning.dto.CourseResponse;
import com.sabeel.learning.dto.EnrollmentResponse;
import com.sabeel.learning.dto.LessonRequest;
import com.sabeel.learning.dto.ProgressRequest;
import com.sabeel.learning.dto.ProgressResponse;
import com.sabeel.learning.dto.RatingRequest;
import com.sabeel.learning.service.LearningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/learning")
@RequiredArgsConstructor
public class LearningController {
    private final LearningService learningService;

    @GetMapping("/courses")
    public List<CourseResponse> courses(@RequestParam(required = false) String category,
                                        @RequestParam(required = false) String q) {
        return learningService.listPublished(category, q);
    }

    @GetMapping("/courses/{slug}")
    public CourseResponse course(@PathVariable String slug) {
        return learningService.getBySlug(slug);
    }

    @PostMapping("/courses")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseResponse createCourse(@AuthenticationPrincipal String userId,
                                       @Valid @RequestBody CourseRequest request) {
        return learningService.createCourse(UUID.fromString(userId), request);
    }

    @PostMapping("/courses/{id}/lessons")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseResponse addLesson(@AuthenticationPrincipal String userId, @PathVariable String id,
                                    @Valid @RequestBody LessonRequest request) {
        return learningService.addLesson(UUID.fromString(userId), id, request);
    }

    @PostMapping("/courses/{id}/publish")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseResponse publish(@AuthenticationPrincipal String userId, @PathVariable String id) {
        return learningService.publish(UUID.fromString(userId), id);
    }

    @PostMapping("/enrollments/{courseId}")
    public EnrollmentResponse enroll(@AuthenticationPrincipal String userId, @PathVariable String courseId) {
        return learningService.enroll(UUID.fromString(userId), courseId);
    }

    @GetMapping("/my-courses")
    public List<EnrollmentResponse> myCourses(@AuthenticationPrincipal String userId) {
        return learningService.myCourses(UUID.fromString(userId));
    }

    @PostMapping("/progress")
    public ProgressResponse progress(@AuthenticationPrincipal String userId,
                                     @Valid @RequestBody ProgressRequest request) {
        return learningService.recordProgress(UUID.fromString(userId), request.enrollmentId(),
                request.lessonId(), request.watchedSeconds());
    }

    @PostMapping("/courses/{id}/ratings")
    public CourseResponse rate(@AuthenticationPrincipal String userId, @PathVariable String id,
                               @Valid @RequestBody RatingRequest request) {
        return learningService.rate(UUID.fromString(userId), id, request.rating(), request.review());
    }
}
