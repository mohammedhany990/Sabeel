package com.sabeel.community.repository;

import com.sabeel.community.domain.Circle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CircleRepository extends JpaRepository<Circle, UUID> {
    Optional<Circle> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);
}
