package com.sabeel.notification.repository;

import com.sabeel.notification.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Notification> findTop100ByStatusAndScheduledForLessThanEqualOrderByScheduledFor(Notification.Status status, Instant now);
    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);
    List<Notification> findByUserIdAndTypeAndStatus(UUID userId, String type, Notification.Status status);
}
