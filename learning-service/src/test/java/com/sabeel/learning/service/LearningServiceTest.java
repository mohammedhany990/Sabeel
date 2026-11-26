package com.sabeel.learning.service;

import com.sabeel.learning.domain.CourseDocument;
import com.sabeel.learning.domain.Enrollment;
import com.sabeel.learning.domain.LessonEmbedded;
import com.sabeel.learning.domain.LessonProgress;
import com.sabeel.learning.domain.Rating;
import com.sabeel.learning.dto.ProgressResponse;
import com.sabeel.learning.event.OutboxService;
import com.sabeel.learning.exception.ApiException;
import com.sabeel.learning.repository.CourseMongoRepository;
import com.sabeel.learning.repository.EnrollmentRepository;
import com.sabeel.learning.repository.LessonProgressRepository;
import com.sabeel.learning.repository.RatingRepository;
import com.sabeel.learning.service.LearningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LearningServiceTest {
    private CourseMongoRepository courseRepository;
    private EnrollmentRepository enrollmentRepository;
    private LessonProgressRepository progressRepository;
    private RatingRepository ratingRepository;
    private OutboxService outboxService;
    private LearningService service;
    private final UUID teacherId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        courseRepository = mock(CourseMongoRepository.class);
        enrollmentRepository = mock(EnrollmentRepository.class);
        progressRepository = mock(LessonProgressRepository.class);
        ratingRepository = mock(RatingRepository.class);
        outboxService = mock(OutboxService.class);
        service = new LearningService(courseRepository, enrollmentRepository, progressRepository,
                ratingRepository, outboxService);
    }

    private CourseDocument draftCourse(String id) {
        return CourseDocument.builder()
                .id(id).title("Tafsir Ibn Kathir").slug("tafsir-ibn-kathir").description("d")
                .teacherId(teacherId.toString()).category(CourseDocument.Category.TAFSIR)
                .status(CourseDocument.Status.DRAFT).lessons(new ArrayList<>())
                .ratingAvg(0).ratingCount(0).createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private CourseDocument publishedCourse(String id) {
        CourseDocument c = draftCourse(id);
        c.setStatus(CourseDocument.Status.PUBLISHED);
        c.getLessons().add(LessonEmbedded.builder().lessonId("lesson-1").title("Intro")
                .videoUrl("https://videos.example/intro.mp4").durationSec(600).sortOrder(1).build());
        return c;
    }

    @Test
    void slugUniquenessAppendsSuffix() {
        when(courseRepository.existsBySlug("tafsir-ibn-kathir")).thenReturn(true);
        when(courseRepository.existsBySlug("tafsir-ibn-kathir-2")).thenReturn(false);
        assertEquals("tafsir-ibn-kathir-2", service.uniqueSlug("Tafsir Ibn Kathir"));
    }

    @Test
    void publishRequiresAtLeastOneLesson() {
        CourseDocument course = draftCourse("c1");
        when(courseRepository.findById("c1")).thenReturn(Optional.of(course));
        assertThrows(ApiException.class, () -> service.publish(teacherId, "c1"));
        verify(courseRepository, never()).save(any());
    }

    @Test
    void publishEmitsCoursePublishedEvent() {
        CourseDocument course = publishedCourse("c1");
        course.setStatus(CourseDocument.Status.DRAFT);
        when(courseRepository.findById("c1")).thenReturn(Optional.of(course));
        when(courseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service.publish(teacherId, "c1");
        verify(outboxService).record(eq("learning.course.published"), eq("c1"), argThat((java.util.Map<String, Object> map) ->
                "c1".equals(map.get("courseId")) && "Tafsir Ibn Kathir".equals(map.get("title"))));
    }

    @Test
    void publishRejectsNonOwner() {
        CourseDocument course = publishedCourse("c1");
        when(courseRepository.findById("c1")).thenReturn(Optional.of(course));
        assertThrows(ApiException.class, () -> service.publish(UUID.randomUUID(), "c1"));
    }

    @Test
    void enrollIsIdempotentAndEmitsEventOnce() {
        CourseDocument course = publishedCourse("c1");
        when(courseRepository.findById("c1")).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByUserIdAndCourseId(userId, "c1")).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service.enroll(userId, "c1");
        verify(outboxService).record(eq("learning.enrollment.created"), eq(userId.toString()), anyMap());

        Enrollment existing = Enrollment.builder().id(UUID.randomUUID()).userId(userId).courseId("c1")
                .enrolledAt(Instant.now()).status("ACTIVE").build();
        when(enrollmentRepository.findByUserIdAndCourseId(userId, "c1")).thenReturn(Optional.of(existing));
        service.enroll(userId, "c1");
        verify(outboxService, times(1)).record(eq("learning.enrollment.created"), anyString(), anyMap());
    }

    @Test
    void progressCompletesAt95Percent() {
        CourseDocument course = publishedCourse("c1");
        Enrollment enrollment = Enrollment.builder().id(UUID.randomUUID()).userId(userId).courseId("c1")
                .enrolledAt(Instant.now()).status("ACTIVE").build();
        LessonProgress progress = LessonProgress.builder().id(UUID.randomUUID())
                .enrollmentId(enrollment.getId()).lessonId("lesson-1")
                .watchedSeconds(550).completed(false).build();
        when(enrollmentRepository.findById(enrollment.getId())).thenReturn(Optional.of(enrollment));
        when(courseRepository.findById("c1")).thenReturn(Optional.of(course));
        when(progressRepository.findByEnrollmentIdAndLessonId(enrollment.getId(), "lesson-1"))
                .thenReturn(Optional.of(progress));
        when(progressRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProgressResponse res = service.recordProgress(userId, enrollment.getId().toString(), "lesson-1", 20);
        assertEquals(570, res.watchedSeconds());
        assertTrue(res.completed());
    }

    @Test
    void progressCapsAtLessonDuration() {
        CourseDocument course = publishedCourse("c1");
        Enrollment enrollment = Enrollment.builder().id(UUID.randomUUID()).userId(userId).courseId("c1")
                .enrolledAt(Instant.now()).status("ACTIVE").build();
        when(enrollmentRepository.findById(enrollment.getId())).thenReturn(Optional.of(enrollment));
        when(courseRepository.findById("c1")).thenReturn(Optional.of(course));
        when(progressRepository.findByEnrollmentIdAndLessonId(enrollment.getId(), "lesson-1"))
                .thenReturn(Optional.empty());
        when(progressRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        ProgressResponse res = service.recordProgress(userId, enrollment.getId().toString(), "lesson-1", 10_000);
        assertEquals(600, res.watchedSeconds());
        assertTrue(res.completed());
    }

    @Test
    void ratingRecomputesAverage() {
        CourseDocument course = publishedCourse("c1");
        when(enrollmentRepository.findByUserIdAndCourseId(userId, "c1"))
                .thenReturn(Optional.of(Enrollment.builder().id(UUID.randomUUID()).userId(userId)
                        .courseId("c1").enrolledAt(Instant.now()).status("ACTIVE").build()));
        when(courseRepository.findById("c1")).thenReturn(Optional.of(course));
        when(ratingRepository.findByUserIdAndCourseId(userId, "c1")).thenReturn(Optional.empty());
        when(ratingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ratingRepository.findByCourseId("c1")).thenReturn(List.of(
                Rating.builder().rating(4).build(), Rating.builder().rating(2).build()));
        when(courseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var res = service.rate(userId, "c1", 4, "great");
        assertEquals(2, res.ratingCount());
        assertEquals(3.0, res.ratingAvg());
    }

    @Test
    void ratingRequiresEnrollment() {
        when(enrollmentRepository.findByUserIdAndCourseId(userId, "c1")).thenReturn(Optional.empty());
        assertThrows(ApiException.class, () -> service.rate(userId, "c1", 5, null));
    }
}
