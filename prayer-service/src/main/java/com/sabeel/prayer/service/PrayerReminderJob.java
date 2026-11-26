package com.sabeel.prayer.service;

import com.sabeel.prayer.domain.PrayerReminderDay;
import com.sabeel.prayer.domain.PrayerSettings;
import com.sabeel.prayer.engine.PrayerName;
import com.sabeel.prayer.engine.PrayerTimesCalculator;
import com.sabeel.prayer.event.OutboxService;
import com.sabeel.prayer.repository.PrayerReminderDayRepository;
import com.sabeel.prayer.repository.PrayerSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;

import static com.sabeel.prayer.config.KafkaConfig.TOPIC_PRAYER_REMINDER;

@Component
@RequiredArgsConstructor
@Slf4j
public class PrayerReminderJob {
    private final PrayerSettingsRepository settingsRepository;
    private final PrayerReminderDayRepository reminderDayRepository;
    private final PrayerTimesCalculator calculator;
    private final OutboxService outboxService;

    @Scheduled(cron = "${prayer.reminder-cron:0 0 * * * *}")
    @Transactional
    public void publishTodayReminders() {
        publishAll(Instant.now());
    }

    public int publishAll(Instant now) {
        int published = 0;
        for (PrayerSettings settings : settingsRepository.findAll()) {
            try {
                published += publishForUser(settings, now);
            } catch (Exception e) {
                log.warn("prayer reminder computation failed for user {}: {}", settings.getUserId(), e.getMessage());
            }
        }
        if (published > 0) {
            log.info("published {} prayer.time.reminder events", published);
        }
        return published;
    }

    public int publishForUser(PrayerSettings settings, Instant now) {
        ZoneId zone = ZoneId.of(settings.getTimezone());
        LocalDate localToday = LocalDate.ofInstant(now, zone);
        if (reminderDayRepository.existsByUserIdAndLocalDate(settings.getUserId(), localToday)) {
            return 0;
        }
        Map<PrayerName, ZonedDateTime> times = calculator.compute(localToday,
                settings.getLatitude(), settings.getLongitude(), zone,
                settings.getMethod(), settings.getAsrFactor());
        int published = 0;
        for (PrayerName prayer : PrayerName.values()) {
            if (prayer == PrayerName.SUNRISE) {
                continue;
            }
            ZonedDateTime at = times.get(prayer);
            if (!at.toInstant().isAfter(now)) {
                continue;
            }
            outboxService.record(TOPIC_PRAYER_REMINDER, settings.getUserId().toString(), Map.of(
                    "userId", settings.getUserId().toString(),
                    "prayer", prayer.name().toLowerCase(),
                    "time", at.toInstant().toString(),
                    "timezone", settings.getTimezone()));
            published++;
        }
        reminderDayRepository.save(new PrayerReminderDay(settings.getUserId(), localToday));
        return published;
    }
}
