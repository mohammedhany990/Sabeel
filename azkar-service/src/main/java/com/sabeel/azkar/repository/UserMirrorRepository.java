package com.sabeel.azkar.repository;

import com.sabeel.azkar.domain.UserMirror;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserMirrorRepository extends JpaRepository<UserMirror, UUID> {
}
