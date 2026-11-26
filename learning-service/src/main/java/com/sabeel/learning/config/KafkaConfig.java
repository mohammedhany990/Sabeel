package com.sabeel.learning.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@EnableKafka
public class KafkaConfig {
    public static final String TOPIC_COURSE_PUBLISHED = "learning.course.published";
    public static final String TOPIC_ENROLLMENT_CREATED = "learning.enrollment.created";

    @Bean
    NewTopic coursePublishedTopic() {
        return TopicBuilder.name(TOPIC_COURSE_PUBLISHED).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic enrollmentCreatedTopic() {
        return TopicBuilder.name(TOPIC_ENROLLMENT_CREATED).partitions(3).replicas(1).build();
    }
}
