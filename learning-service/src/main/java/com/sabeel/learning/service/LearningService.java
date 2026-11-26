package com.sabeel.learning.service;

import com.sabeel.learning.domain.CourseDocument;
import com.sabeel.learning.domain.Enrollment;
import com.sabeel.learning.domain.LessonEmbedded;
import com.sabeel.learning.domain.LessonProgress;
import com.sabeel.learning.domain.Rating;
import com.sabeel.learning.dto.CourseRequest;
import com.sabeel.learning.dto.CourseResponse;
import com.sabeel.learning.dto.EnrollmentResponse;
import com.sabeel.learning.dto.LessonRequest;
import com.sabeel.learning.dto.ProgressResponse;
import com.sabeel.learning.event.OutboxService;
import com.sabeel.learning.exception.ApiException;
import com.sabeel.learning.repository.CourseMongoRepository;
import com.sabeel.learning.repository.EnrollmentRepository;
import com.sabeel.learning.repository.LessonProgressRepository;
import com.sabeel.learning.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import static com.sabeel.learning.config.KafkaConfig.TOPIC_COURSE_PUBLISHED;
import static com.sabeel.learning.config.KafkaConfig.TOPIC_ENROLLMENT_CREATED;

@Service
@RequiredArgsConstructor
public class LearningService {
    private final CourseMongoRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository progressRepository;
    private final RatingRepository ratingRepository;
    private final OutboxService outboxService;

    public List<CourseResponse> listPublished(String category, String q) {
        CourseDocument.Category cat = parseCategory(category);
        boolean hasQ = q != null && !q.isBlank();
        List<CourseDocument> courses = cat == null
                ? (hasQ ? courseRepository.findByStatusAndTitleContainingIgnoreCase(CourseDocument.Status.PUBLISHED, q.trim())
                        : courseRepository.findByStatus(CourseDocument.Status.PUBLISHED))
                : (hasQ ? courseRepository.findByStatusAndCategoryAndTitleContainingIgnoreCase(CourseDocument.Status.PUBLISHED, cat, q.trim())
                        : courseRepository.findByStatusAndCategory(CourseDocument.Status.PUBLISHED, cat));
        return courses.stream().map(this::toCourseResponse).toList();
    }

    public CourseResponse getBySlug(String slug) {
        CourseDocument course = courseRepository.findBySlug(slug)
                .filter(c -> c.getStatus() == CourseDocument.Status.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("course not found"));
        return toCourseResponse(course);
    }

    public CourseResponse createCourse(UUID teacherId, CourseRequest request) {
        CourseDocument course = CourseDocument.builder()
                .title(request.title().trim())
                .slug(uniqueSlug(request.title()))
                .description(request.description())
                .teacherId(teacherId.toString())
                .category(parseCategoryRequired(request.category()))
                .thumbnailUrl(request.thumbnailUrl())
                .status(CourseDocument.Status.DRAFT)
                .lessons(new java.util.ArrayList<>())
                .ratingAvg(0).ratingCount(0)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
        return toCourseResponse(courseRepository.save(course));
    }

    public CourseResponse addLesson(UUID teacherId, String courseId, LessonRequest request) {
        CourseDocument course = ownedCourse(teacherId, courseId);
        if (course.getStatus() == CourseDocument.Status.ARCHIVED) {
            throw ApiException.conflict("cannot add lessons to an archived course");
        }
        course.getLessons().add(LessonEmbedded.builder()
                .lessonId(UUID.randomUUID().toString().replace("-", "").substring(0, 24))
                .title(request.title()).videoUrl(request.videoUrl())
                .durationSec(request.durationSec()).description(request.description())
                .sortOrder(request.sortOrder()).build());
        course.getLessons().sort(java.util.Comparator.comparingInt(LessonEmbedded::getSortOrder));
        course.setUpdatedAt(Instant.now());
        return toCourseResponse(courseRepository.save(course));
    }

    @Transactional
    public CourseResponse publish(UUID teacherId, String courseId) {
        CourseDocument course = ownedCourse(teacherId, courseId);
        if (course.getStatus() != CourseDocument.Status.DRAFT) {
            throw ApiException.conflict("only a draft course can be published");
        }
        if (course.getLessons().isEmpty()) {
            throw ApiException.badRequest("a course needs at least one lesson before publishing");
        }
        course.setStatus(CourseDocument.Status.PUBLISHED);
        course.setUpdatedAt(Instant.now());
        CourseDocument saved = courseRepository.save(course);
        outboxService.record(TOPIC_COURSE_PUBLISHED, saved.getId(), Map.of(
                "courseId", saved.getId(), "title", saved.getTitle(), "teacherId", saved.getTeacherId()));
        return toCourseResponse(saved);
    }

    @Transactional
    public EnrollmentResponse enroll(UUID userId, String courseId) {
        CourseDocument course = courseRepository.findById(courseId)
                .filter(c -> c.getStatus() == CourseDocument.Status.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("course not found"));
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseGet(() -> {
                    Enrollment created = enrollmentRepository.save(Enrollment.builder()
                            .id(UUID.randomUUID()).userId(userId).courseId(courseId)
                            .enrolledAt(Instant.now()).status("ACTIVE").build());
                    outboxService.record(TOPIC_ENROLLMENT_CREATED, userId.toString(), Map.of(
                            "userId", userId.toString(), "courseId", courseId, "title", course.getTitle()));
                    return created;
                });
        return toEnrollmentResponse(enrollment, course);
    }

    public List<EnrollmentResponse> myCourses(UUID userId) {
        return enrollmentRepository.findByUserIdOrderByEnrolledAtDesc(userId).stream()
                .map(e -> toEnrollmentResponse(e, courseRepository.findById(e.getCourseId()).orElse(null)))
                .toList();
    }

    @Transactional
    public ProgressResponse recordProgress(UUID userId, String enrollmentId, String lessonId, int watchedSeconds) {
        Enrollment enrollment = enrollmentRepository.findById(UUID.fromString(enrollmentId))
                .orElseThrow(() -> ApiException.notFound("enrollment not found"));
        if (!enrollment.getUserId().equals(userId)) {
            throw ApiException.notFound("enrollment not found");
        }
        CourseDocument course = courseRepository.findById(enrollment.getCourseId())
                .orElseThrow(() -> ApiException.notFound("course not found"));
        LessonEmbedded lesson = course.getLessons().stream()
                .filter(l -> l.getLessonId().equals(lessonId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("lesson not found in this course"));
        LessonProgress progress = progressRepository.findByEnrollmentIdAndLessonId(enrollment.getId(), lessonId)
                .orElse(LessonProgress.builder().id(UUID.randomUUID()).enrollmentId(enrollment.getId())
                        .lessonId(lessonId).watchedSeconds(0).completed(false).build());
        progress.setWatchedSeconds(Math.min(lesson.getDurationSec(), progress.getWatchedSeconds() + watchedSeconds));
        progress.setCompleted(progress.getWatchedSeconds() >= Math.ceil(lesson.getDurationSec() * 0.95));
        progress.setLastWatchedAt(Instant.now());
        LessonProgress saved = progressRepository.save(progress);
        return new ProgressResponse(enrollmentId, lessonId, saved.getWatchedSeconds(), saved.isCompleted());
    }

    @Transactional
    public CourseResponse rate(UUID userId, String courseId, int ratingValue, String review) {
        enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> ApiException.conflict("enroll in the course before rating it"));
        CourseDocument course = courseRepository.findById(courseId)
                .orElseThrow(() -> ApiException.notFound("course not found"));
        Rating rating = ratingRepository.findByUserIdAndCourseId(userId, courseId)
                .orElse(Rating.builder().id(UUID.randomUUID()).userId(userId).courseId(courseId).build());
        rating.setRating(ratingValue);
        rating.setReview(review);
        ratingRepository.save(rating);
        List<Rating> all = ratingRepository.findByCourseId(courseId);
        course.setRatingCount(all.size());
        course.setRatingAvg(all.stream().mapToInt(Rating::getRating).average().orElse(0.0));
        course.setUpdatedAt(Instant.now());
        return toCourseResponse(courseRepository.save(course));
    }

    private CourseDocument ownedCourse(UUID teacherId, String courseId) {
        CourseDocument course = courseRepository.findById(courseId)
                .orElseThrow(() -> ApiException.notFound("course not found"));
        if (!course.getTeacherId().equals(teacherId.toString())) {
            throw ApiException.notFound("course not found");
        }
        return course;
    }

    String uniqueSlug(String title) {
        String base = title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        if (base.isBlank()) {
            base = "course";
        }
        String slug = base;
        int suffix = 2;
        while (courseRepository.existsBySlug(slug)) {
            slug = base + "-" + suffix++;
        }
        return slug;
    }

    private CourseDocument.Category parseCategory(String category) {
        if (category == null || category.isBlank()) {
            return null;
        }
        return parseCategoryRequired(category);
    }

    private CourseDocument.Category parseCategoryRequired(String category) {
        try {
            return CourseDocument.Category.valueOf(category.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw ApiException.badRequest("unknown category '" + category + "'; one of TAFSIR, HADITH, FIQH, SEERAH, TAJWEED");
        }
    }

    private CourseResponse toCourseResponse(CourseDocument c) {
        return new CourseResponse(c.getId(), c.getTitle(), c.getSlug(), c.getDescription(), c.getTeacherId(),
                c.getCategory().name(), c.getThumbnailUrl(), c.getStatus().name(),
                c.getLessons().stream().map(l -> new CourseResponse.LessonResponse(
                        l.getLessonId(), l.getTitle(), l.getVideoUrl(), l.getDurationSec(),
                        l.getDescription(), l.getSortOrder())).toList(),
                Math.round(c.getRatingAvg() * 100.0) / 100.0, c.getRatingCount());
    }

    private EnrollmentResponse toEnrollmentResponse(Enrollment e, CourseDocument course) {
        int completed = (int) progressRepository.findByEnrollmentId(e.getId()).stream()
                .filter(LessonProgress::isCompleted).count();
        return new EnrollmentResponse(e.getId().toString(), e.getCourseId(),
                course == null ? "" : course.getTitle(), e.getStatus(), e.getEnrolledAt().toString(),
                completed, course == null ? 0 : course.getLessons().size());
    }
}
