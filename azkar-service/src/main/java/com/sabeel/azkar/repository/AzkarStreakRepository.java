package com.sabeel.azkar.repository;

import com.sabeel.azkar.domain.AzkarStreak;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AzkarStreakRepository extends JpaRepository<AzkarStreak, UUID> {
    Optional<AzkarStreak> findByUserIdAndCategoryCode(UUID userId, String categoryCode);
    List<AzkarStreak> findByUserId(UUID userId);
}
