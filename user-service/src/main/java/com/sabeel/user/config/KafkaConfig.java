package com.sabeel.user.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@EnableKafka
public class KafkaConfig {
    public static final String TOPIC_USER_REGISTERED = "auth.user.registered";
    public static final String TOPIC_DEVICE_TOKEN = "user.device-token.registered";
    public static final String TOPIC_PREFERENCES_UPDATED = "user.preferences.updated";

    @Bean
    NewTopic deviceTokenTopic() {
        return TopicBuilder.name(TOPIC_DEVICE_TOKEN).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic preferencesUpdatedTopic() {
        return TopicBuilder.name(TOPIC_PREFERENCES_UPDATED).partitions(3).replicas(1).build();
    }
}
