package com.sabeel.notification.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.util.List;

@Service
@Slf4j
public class PushSender {
    @Value("${notification.fcm.enabled:false}")
    private boolean fcmEnabled;

    @Value("${notification.fcm.credentials-path:}")
    private String credentialsPath;

    private volatile FirebaseMessaging messaging;

    public void send(List<String> fcmTokens, String title, String body) {
        if (fcmTokens.isEmpty()) {
            log.info("no device tokens, push skipped: {}", title);
            return;
        }
        if (!fcmEnabled) {
            log.info("FCM disabled, push logged only: {} -> {} tokens", title, fcmTokens.size());
            return;
        }
        for (String token : fcmTokens) {
            try {
                Message message = Message.builder()
                        .setToken(token)
                        .setNotification(com.google.firebase.messaging.Notification.builder()
                                .setTitle(title).setBody(body).build())
                        .build();
                messaging().send(message);
            } catch (Exception e) {
                log.error("FCM send failed for token: {}", e.getMessage());
                throw new IllegalStateException("push delivery failed", e);
            }
        }
        log.info("push sent to {} tokens", fcmTokens.size());
    }

    private FirebaseMessaging messaging() throws Exception {
        if (messaging == null) {
            synchronized (this) {
                if (messaging == null) {
                    try (var stream = new FileInputStream(credentialsPath)) {
                        FirebaseApp app = FirebaseApp.initializeApp(FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(stream))
                                .build());
                        messaging = FirebaseMessaging.getInstance(app);
                    }
                }
            }
        }
        return messaging;
    }
}
