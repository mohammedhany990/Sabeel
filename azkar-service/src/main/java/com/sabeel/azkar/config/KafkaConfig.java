package com.sabeel.azkar.config;

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
    public static final String TOPIC_AZKAR_REMINDER = "azkar.reminder";
    public static final String TOPIC_STREAK_MILESTONE = "azkar.streak.milestone";
    public static final String TOPIC_USER_REGISTERED = "auth.user.registered";
    public static final String TOPIC_PREFERENCES_UPDATED = "user.preferences.updated";

    @Bean
    NewTopic azkarReminderTopic() {
        return TopicBuilder.name(TOPIC_AZKAR_REMINDER).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic streakMilestoneTopic() {
        return TopicBuilder.name(TOPIC_STREAK_MILESTONE).partitions(3).replicas(1).build();
    }

    @Bean
    CommonErrorHandler commonErrorHandler(KafkaTemplate<String, String> kafkaTemplate) {
        var recoverer = new DeadLetterPublishingRecoverer(kafkaTemplate);
        return new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 3L));
    }
}
