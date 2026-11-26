package com.sabeel.community.repository;

import com.sabeel.community.domain.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserBadgeRepository extends JpaRepository<UserBadge, UUID> {
    List<UserBadge> findByUserIdOrderByAwardedAtDesc(UUID userId);

    Optional<UserBadge> findByUserIdAndBadgeCode(UUID userId, String badgeCode);
}
