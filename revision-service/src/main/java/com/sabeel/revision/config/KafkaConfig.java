package com.sabeel.revision.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@EnableKafka
public class KafkaConfig {
    public static final String TOPIC_TASK_COMPLETED = "memorization.task.completed";
    public static final String TOPIC_REVISION_DUE = "revision.due";
    public static final String TOPIC_ITEM_MASTERED = "revision.item.mastered";

    @Bean
    NewTopic revisionDueTopic() {
        return TopicBuilder.name(TOPIC_REVISION_DUE).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic itemMasteredTopic() {
        return TopicBuilder.name(TOPIC_ITEM_MASTERED).partitions(3).replicas(1).build();
    }

    @Bean
    org.springframework.kafka.listener.CommonErrorHandler commonErrorHandler(
            org.springframework.kafka.core.KafkaTemplate<String, String> kafkaTemplate) {
        var recoverer = new org.springframework.kafka.listener.DeadLetterPublishingRecoverer(kafkaTemplate);
        var backOff = new org.springframework.util.backoff.FixedBackOff(1000L, 3L);
        return new org.springframework.kafka.listener.DefaultErrorHandler(recoverer, backOff);
    }
}
