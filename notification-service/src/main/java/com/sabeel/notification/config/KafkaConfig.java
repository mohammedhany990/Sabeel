package com.sabeel.notification.config;

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
    public static final String TOPIC_USER_REGISTERED = "auth.user.registered";
    public static final String TOPIC_PASSWORD_RESET = "auth.password.reset-requested";
    public static final String TOPIC_TASK_CREATED = "memorization.task.created";
    public static final String TOPIC_TASK_COMPLETED = "memorization.task.completed";
    public static final String TOPIC_PLAN_COMPLETED = "memorization.plan.completed";
    public static final String TOPIC_REVISION_DUE = "revision.due";
    public static final String TOPIC_ITEM_MASTERED = "revision.item.mastered";
    public static final String TOPIC_DEVICE_TOKEN = "user.device-token.registered";
    public static final String TOPIC_PREFERENCES_UPDATED = "user.preferences.updated";
    public static final String TOPIC_PRAYER_REMINDER = "prayer.time.reminder";
    public static final String TOPIC_PRAYER_SETTINGS_UPDATED = "prayer.settings.updated";
    public static final String TOPIC_AZKAR_REMINDER = "azkar.reminder";
    public static final String TOPIC_STREAK_MILESTONE = "azkar.streak.milestone";
    public static final String TOPIC_COURSE_PUBLISHED = "learning.course.published";
    public static final String TOPIC_ENROLLMENT_CREATED = "learning.enrollment.created";
    public static final String TOPIC_EVALUATION_COMPLETED = "recitation.evaluation.completed";
    public static final String TOPIC_BADGE_AWARDED = "community.badge.awarded";

    @Bean
    NewTopic preferencesUpdatedTopic() {
        return TopicBuilder.name(TOPIC_PREFERENCES_UPDATED).partitions(3).replicas(1).build();
    }

    @Bean
    CommonErrorHandler commonErrorHandler(KafkaTemplate<String, String> kafkaTemplate) {
        var recoverer = new DeadLetterPublishingRecoverer(kafkaTemplate);
        return new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 3L));
    }
}
