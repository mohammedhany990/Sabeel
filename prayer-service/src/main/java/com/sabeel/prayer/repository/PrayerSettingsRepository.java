package com.sabeel.prayer.repository;

import com.sabeel.prayer.domain.PrayerSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PrayerSettingsRepository extends JpaRepository<PrayerSettings, UUID> {
}
