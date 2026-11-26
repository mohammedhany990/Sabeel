package com.sabeel.azkar.repository;

import com.sabeel.azkar.domain.AzkarReminderDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.UUID;

public interface AzkarReminderDayRepository extends JpaRepository<AzkarReminderDay, AzkarReminderDay.PK> {
    boolean existsByUserIdAndLocalDateAndCategoryCode(UUID userId, LocalDate localDate, String categoryCode);
}
