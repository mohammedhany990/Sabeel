package com.sabeel.notification.repository;

import com.sabeel.notification.domain.UserMirror;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserMirrorRepository extends JpaRepository<UserMirror, UUID> {
}
