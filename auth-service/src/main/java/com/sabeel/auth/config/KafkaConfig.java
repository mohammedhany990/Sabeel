package com.sabeel.auth.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {
    @Bean
    NewTopic userRegisteredTopic() {
        return TopicBuilder.name(KafkaTopics.TOPIC_USER_REGISTERED).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic passwordResetTopic() {
        return TopicBuilder.name(KafkaTopics.TOPIC_PASSWORD_RESET).partitions(3).replicas(1).build();
    }
}
