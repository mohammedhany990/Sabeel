package com.sabeel.prayer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PrayerServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PrayerServiceApplication.class, args);
    }
}
