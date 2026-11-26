package com.sabeel.memorization;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MemorizationServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MemorizationServiceApplication.class, args);
    }
}
