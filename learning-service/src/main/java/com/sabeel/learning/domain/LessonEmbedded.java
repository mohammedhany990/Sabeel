package com.sabeel.learning.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonEmbedded {
    private String lessonId;
    private String title;
    private String videoUrl;
    private int durationSec;
    private String description;
    private int sortOrder;
}
