package com.sabeel.community.repository;

import com.sabeel.community.domain.UserStat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserStatRepository extends JpaRepository<UserStat, UUID> {
    Optional<UserStat> findByUserIdAndMetric(UUID userId, String metric);
}
