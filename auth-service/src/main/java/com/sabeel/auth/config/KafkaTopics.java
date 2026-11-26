package com.sabeel.auth.config;

public final class KafkaTopics {
    public static final String TOPIC_USER_REGISTERED = "auth.user.registered";
    public static final String TOPIC_PASSWORD_RESET = "auth.password.reset-requested";

    private KafkaTopics() {
    }
}
