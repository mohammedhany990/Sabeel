package com.sabeel.revision;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RevisionServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(RevisionServiceApplication.class, args);
    }
}
