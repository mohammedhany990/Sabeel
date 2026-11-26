package com.sabeel.recitation.config;

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
    public static final String TOPIC_EVALUATION_REQUESTED = "recitation.evaluation.requested";
    public static final String TOPIC_EVALUATION_COMPLETED = "recitation.evaluation.completed";

    @Bean
    NewTopic evaluationRequestedTopic() {
        return TopicBuilder.name(TOPIC_EVALUATION_REQUESTED).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic evaluationCompletedTopic() {
        return TopicBuilder.name(TOPIC_EVALUATION_COMPLETED).partitions(3).replicas(1).build();
    }

    @Bean
    CommonErrorHandler commonErrorHandler(KafkaTemplate<String, String> kafkaTemplate) {
        var recoverer = new DeadLetterPublishingRecoverer(kafkaTemplate);
        return new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 3L));
    }
}
