package com.sabeel.prayer.service;

import com.sabeel.prayer.domain.PrayerLog;
import com.sabeel.prayer.dto.PrayerLogRequest;
import com.sabeel.prayer.dto.PrayerTrackerResponse;
import com.sabeel.prayer.exception.ApiException;
import com.sabeel.prayer.repository.PrayerLogRepository;
import com.sabeel.prayer.repository.PrayerSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrayerTrackerService {
    public static final List<String> DAILY = List.of("FAJR", "DHUHR", "ASR", "MAGHRIB", "ISHA");
    static final int MAX_RANGE_DAYS = 366;

    private final PrayerLogRepository repository;
    private final PrayerSettingsRepository settingsRepository;

    @Transactional
    public void log(UUID userId, PrayerLogRequest request) {
        String timezone = timezone(userId);
        String prayer = request.prayer().toUpperCase();
        if (!DAILY.contains(prayer)) {
            throw ApiException.badRequest("prayer must be one of FAJR, DHUHR, ASR, MAGHRIB, ISHA");
        }
        LocalDate date = parse(request.date());
        LocalDate today = today(timezone);
        if (date.isAfter(today)) {
            throw ApiException.badRequest("cannot log a prayer for a future date");
        }
        PrayerLog.PK key = new PrayerLog.PK(userId, date, prayer);
        if (request.prayed()) {
            repository.save(new PrayerLog(userId, date, prayer));
        } else if (repository.existsById(key)) {
            repository.deleteById(key);
        }
    }

    @Transactional(readOnly = true)
    public PrayerTrackerResponse range(UUID userId, String fromText, String toText) {
        String timezone = timezone(userId);
        LocalDate to = toText == null || toText.isBlank() ? today(timezone) : parse(toText);
        LocalDate from = fromText == null || fromText.isBlank() ? to.minusDays(6) : parse(fromText);
        if (from.isAfter(to) || ChronoUnit.DAYS.between(from, to) >= MAX_RANGE_DAYS) {
            throw ApiException.badRequest("range must be from <= to and at most 366 days");
        }
        Map<LocalDate, Set<String>> byDay = new TreeMap<>();
        for (PrayerLog l : repository.findByUserIdAndLocalDateBetween(userId, from, to)) {
            byDay.computeIfAbsent(l.getLocalDate(), d -> new java.util.TreeSet<>()).add(l.getPrayer());
        }
        Map<String, List<String>> days = new TreeMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            days.put(d.toString(), new ArrayList<>(byDay.getOrDefault(d, Set.of())));
        }
        int prayed = byDay.values().stream().mapToInt(Set::size).sum();
        int possible = (int) (ChronoUnit.DAYS.between(from, to) + 1) * DAILY.size();
        LocalDate today = today(timezone);
        LocalDate streakEnd = to.isAfter(today) ? today : to;
        return new PrayerTrackerResponse(from.toString(), to.toString(), days,
                currentStreak(byDay, streakEnd), bestStreak(byDay, from, to), prayed, possible);
    }

    private String timezone(UUID userId) {
        return settingsRepository.findById(userId).map(com.sabeel.prayer.domain.PrayerSettings::getTimezone).orElse("UTC");
    }

    static boolean complete(Map<LocalDate, Set<String>> byDay, LocalDate day) {
        return byDay.getOrDefault(day, Set.of()).containsAll(DAILY);
    }

    static int currentStreak(Map<LocalDate, Set<String>> byDay, LocalDate end) {
        LocalDate day = complete(byDay, end) ? end : end.minusDays(1);
        int streak = 0;
        while (complete(byDay, day)) {
            streak++;
            day = day.minusDays(1);
        }
        return streak;
    }

    static int bestStreak(Map<LocalDate, Set<String>> byDay, LocalDate from, LocalDate to) {
        int best = 0;
        int run = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            run = complete(byDay, d) ? run + 1 : 0;
            best = Math.max(best, run);
        }
        return best;
    }

    private static LocalDate parse(String text) {
        try {
            return LocalDate.parse(text);
        } catch (DateTimeException e) {
            throw ApiException.badRequest("date must be YYYY-MM-DD");
        }
    }

    private static LocalDate today(String timezone) {
        try {
            return LocalDate.now(ZoneId.of(timezone == null || timezone.isBlank() ? "UTC" : timezone));
        } catch (DateTimeException e) {
            throw ApiException.badRequest("unknown timezone");
        }
    }
}
