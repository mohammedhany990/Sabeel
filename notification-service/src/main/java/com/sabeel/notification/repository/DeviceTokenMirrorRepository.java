package com.sabeel.notification.repository;

import com.sabeel.notification.domain.DeviceTokenMirror;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DeviceTokenMirrorRepository extends JpaRepository<DeviceTokenMirror, String> {
    List<DeviceTokenMirror> findByUserId(UUID userId);
}
