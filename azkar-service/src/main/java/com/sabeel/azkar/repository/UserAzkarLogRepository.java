package com.sabeel.azkar.repository;

import com.sabeel.azkar.domain.UserAzkarLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserAzkarLogRepository extends JpaRepository<UserAzkarLog, UUID> {
    Optional<UserAzkarLog> findByUserIdAndAzkarItemIdAndLogDate(UUID userId, Integer azkarItemId, LocalDate logDate);
    List<UserAzkarLog> findByUserIdAndLogDate(UUID userId, LocalDate logDate);

    @Query("select distinct l.userId from UserAzkarLog l where l.logDate >= :since")
    List<UUID> findActiveUserIdsSince(LocalDate since);
}
