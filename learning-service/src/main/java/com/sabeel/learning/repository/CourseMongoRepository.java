package com.sabeel.learning.repository;

import com.sabeel.learning.domain.CourseDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CourseMongoRepository extends MongoRepository<CourseDocument, String> {
    Optional<CourseDocument> findBySlug(String slug);
    boolean existsBySlug(String slug);
    List<CourseDocument> findByStatus(CourseDocument.Status status);
    List<CourseDocument> findByStatusAndCategory(CourseDocument.Status status, CourseDocument.Category category);
    List<CourseDocument> findByStatusAndTitleContainingIgnoreCase(CourseDocument.Status status, String title);
    List<CourseDocument> findByStatusAndCategoryAndTitleContainingIgnoreCase(CourseDocument.Status status, CourseDocument.Category category, String title);
}
