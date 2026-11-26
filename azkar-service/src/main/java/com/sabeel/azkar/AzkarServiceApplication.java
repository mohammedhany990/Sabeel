package com.sabeel.azkar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AzkarServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AzkarServiceApplication.class, args);
    }
}
