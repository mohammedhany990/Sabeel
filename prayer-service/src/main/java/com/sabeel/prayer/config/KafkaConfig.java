package com.sabeel.prayer.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@EnableKafka
public class KafkaConfig {
    public static final String TOPIC_PRAYER_REMINDER = "prayer.time.reminder";
    public static final String TOPIC_PRAYER_SETTINGS_UPDATED = "prayer.settings.updated";

    @Bean
    NewTopic prayerReminderTopic() {
        return TopicBuilder.name(TOPIC_PRAYER_REMINDER).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic prayerSettingsUpdatedTopic() {
        return TopicBuilder.name(TOPIC_PRAYER_SETTINGS_UPDATED).partitions(3).replicas(1).build();
    }
}
