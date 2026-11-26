package com.sabeel.community.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
@EnableKafka
public class KafkaConfig {
    public static final String TOPIC_TASK_COMPLETED = "memorization.task.completed";
    public static final String TOPIC_PLAN_COMPLETED = "memorization.plan.completed";
    public static final String TOPIC_STREAK_MILESTONE = "azkar.streak.milestone";
    public static final String TOPIC_BADGE_AWARDED = "community.badge.awarded";

    @Bean
    NewTopic badgeAwardedTopic() {
        return TopicBuilder.name(TOPIC_BADGE_AWARDED).partitions(3).replicas(1).build();
    }

    @Bean
    CommonErrorHandler commonErrorHandler(KafkaTemplate<String, String> kafkaTemplate) {
        var recoverer = new DeadLetterPublishingRecoverer(kafkaTemplate);
        return new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 3L));
    }
}
