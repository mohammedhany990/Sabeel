package com.sabeel.prayer.repository;

import com.sabeel.prayer.domain.PrayerReminderDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.UUID;

public interface PrayerReminderDayRepository extends JpaRepository<PrayerReminderDay, PrayerReminderDay.PK> {
    boolean existsByUserIdAndLocalDate(UUID userId, LocalDate localDate);
    void deleteByUserId(UUID userId);
}
