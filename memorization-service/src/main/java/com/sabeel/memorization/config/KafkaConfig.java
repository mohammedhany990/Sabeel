package com.sabeel.memorization.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {
    public static final String TOPIC_TASK_CREATED = "memorization.task.created";
    public static final String TOPIC_TASK_COMPLETED = "memorization.task.completed";
    public static final String TOPIC_PLAN_COMPLETED = "memorization.plan.completed";

    @Bean
    NewTopic taskCreatedTopic() {
        return TopicBuilder.name(TOPIC_TASK_CREATED).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic taskCompletedTopic() {
        return TopicBuilder.name(TOPIC_TASK_COMPLETED).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic planCompletedTopic() {
        return TopicBuilder.name(TOPIC_PLAN_COMPLETED).partitions(3).replicas(1).build();
    }
}
