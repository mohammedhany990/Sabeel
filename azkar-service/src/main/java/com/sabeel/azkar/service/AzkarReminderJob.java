package com.sabeel.azkar.service;

import com.sabeel.azkar.domain.AzkarReminderDay;
import com.sabeel.azkar.event.OutboxService;
import com.sabeel.azkar.repository.AzkarReminderDayRepository;
import com.sabeel.azkar.repository.UserAzkarLogRepository;
import com.sabeel.azkar.repository.UserMirrorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;

import static com.sabeel.azkar.config.KafkaConfig.TOPIC_AZKAR_REMINDER;

@Component
@RequiredArgsConstructor
@Slf4j
public class AzkarReminderJob {
    private final UserAzkarLogRepository logRepository;
    private final UserMirrorRepository userMirrorRepository;
    private final AzkarReminderDayRepository reminderDayRepository;
    private final OutboxService outboxService;

    @Scheduled(cron = "${azkar.reminder-cron:0 0 * * * *}")
    @Transactional
    public void publishDailyReminders() {
        publishAll(Instant.now());
    }

    public int publishAll(Instant now) {
        int published = 0;
        LocalDate activeSince = LocalDate.ofInstant(now, ZoneId.of("UTC")).minusDays(30);
        for (UUID userId : logRepository.findActiveUserIdsSince(activeSince)) {
            ZoneId zone = userMirrorRepository.findById(userId)
                    .map(m -> m.getTimezone() == null || m.getTimezone().isBlank() ? "UTC" : m.getTimezone())
                    .map(tz -> {
                        try {
                            return ZoneId.of(tz);
                        } catch (Exception e) {
                            return ZoneId.of("UTC");
                        }
                    })
                    .orElse(ZoneId.of("UTC"));
            LocalDate localToday = LocalDate.ofInstant(now, zone);
            for (String category : new String[]{"MORNING", "EVENING"}) {
                if (reminderDayRepository.existsByUserIdAndLocalDateAndCategoryCode(userId, localToday, category)) {
                    continue;
                }
                outboxService.record(TOPIC_AZKAR_REMINDER, userId.toString(), Map.of(
                        "userId", userId.toString(),
                        "categoryCode", category,
                        "date", localToday.toString()));
                reminderDayRepository.save(new AzkarReminderDay(userId, localToday, category));
                published++;
            }
        }
        if (published > 0) {
            log.info("published {} azkar.reminder events", published);
        }
        return published;
    }
}
