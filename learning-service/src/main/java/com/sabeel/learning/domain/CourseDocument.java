package com.sabeel.learning.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "courses")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseDocument {
    @Id
    private String id;
    private String title;
    private String slug;
    private String description;
    private String teacherId;
    private Category category;
    private String thumbnailUrl;
    private Status status;
    @Builder.Default
    private List<LessonEmbedded> lessons = new ArrayList<>();
    private double ratingAvg;
    private int ratingCount;
    private Instant createdAt;
    private Instant updatedAt;

    public enum Category { TAFSIR, HADITH, FIQH, SEERAH, TAJWEED }
    public enum Status { DRAFT, PUBLISHED, ARCHIVED }
}
