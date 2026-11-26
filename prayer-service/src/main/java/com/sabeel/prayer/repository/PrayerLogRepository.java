package com.sabeel.prayer.repository;

import com.sabeel.prayer.domain.PrayerLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PrayerLogRepository extends JpaRepository<PrayerLog, PrayerLog.PK> {
    List<PrayerLog> findByUserIdAndLocalDateBetween(UUID userId, LocalDate from, LocalDate to);
}
