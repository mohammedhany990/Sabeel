package com.sabeel.prayer.service;

import com.sabeel.prayer.domain.PrayerSettings;
import com.sabeel.prayer.dto.*;
import com.sabeel.prayer.config.KafkaConfig;
import com.sabeel.prayer.engine.*;
import com.sabeel.prayer.exception.ApiException;
import com.sabeel.prayer.event.OutboxService;
import com.sabeel.prayer.repository.PrayerReminderDayRepository;
import com.sabeel.prayer.repository.PrayerSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PrayerService {
    private final PrayerSettingsRepository settingsRepository;
    private final PrayerReminderDayRepository reminderDayRepository;
    private final OutboxService outboxService;
    private final PrayerTimesCalculator calculator;
    private final QiblaCalculator qiblaCalculator;
    private final HijriCalendar hijriCalendar;

    public PrayerTimesResponse times(UUID userId, LocalDate date, Double lat, Double lng, String methodName) {
        ResolvedLocation location = resolveLocation(userId, lat, lng, methodName);
        ZoneId zone = parseZone(location.timezone());
        Map<PrayerName, ZonedDateTime> times;
        try {
            times = calculator.compute(date, location.latitude(), location.longitude(),
                    zone, location.method(), location.asrFactor());
        } catch (IllegalArgumentException e) {
            throw new ApiException(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY,
                    "Prayer times are unavailable for latitude " + location.latitude() + " on " + date
                            + " with method " + location.method().name()
                            + ": the sun does not reach the required angle. High-latitude adjustment is not"
                            + " implemented in this MVP; verify these times against a local religious authority.");
        }
        Map<String, ZonedDateTime> named = new LinkedHashMap<>();
        times.forEach((k, v) -> named.put(k.name().toLowerCase(), v));
        Map<String, String> namesAr = new LinkedHashMap<>();
        times.keySet().forEach(k -> namesAr.put(k.name().toLowerCase(), arabicName(k)));
        HijriCalendar.HijriDate hijriDate = hijriCalendar.toHijri(date);
        return new PrayerTimesResponse(date.toString(), location.method().name(), zone.getId(), named,
                hijriDate.formatted(), hijriDate.formattedAr(), namesAr);
    }

    public List<PrayerTimesResponse> month(UUID userId, int year, int month, Double lat, Double lng, String methodName) {
        YearMonth ym = YearMonth.of(year, month);
        List<PrayerTimesResponse> days = new ArrayList<>();
        for (int d = 1; d <= ym.lengthOfMonth(); d++) {
            days.add(times(userId, ym.atDay(d), lat, lng, methodName));
        }
        return days;
    }

    public QiblaResponse qibla(double lat, double lng) {
        double bearing = Math.round(qiblaCalculator.bearingDegrees(lat, lng) * 100.0) / 100.0;
        return new QiblaResponse(lat, lng, bearing, compassDirection(bearing));
    }

    public HijriResponse hijri(LocalDate date) {
        HijriCalendar.HijriDate h = hijriCalendar.toHijri(date);
        return new HijriResponse(date.toString(), h.formatted(), h.year(), h.month(), h.day(), h.monthName(),
                "Tabular Islamic (civil) calendar; may differ by a day from local moon-sighting calendars",
                h.formattedAr(), h.monthNameAr(),
                "التقويم الهجري الحسابي (المدني)، وقد يختلف بيوم عن التقويم المعتمد على رؤية الهلال في بلدك");
    }

    static String arabicName(PrayerName name) {
        return switch (name) {
            case FAJR -> "الفجر";
            case SUNRISE -> "الشروق";
            case DHUHR -> "الظهر";
            case ASR -> "العصر";
            case MAGHRIB -> "المغرب";
            case ISHA -> "العشاء";
        };
    }

    @Transactional
    public SettingsResponse saveSettings(UUID userId, SettingsRequest request) {
        CalculationMethod method = parseMethod(request.method());
        parseZone(request.timezone());
        int asrFactor = request.asrFactor() == null ? 1 : request.asrFactor();
        if (asrFactor != 1 && asrFactor != 2) {
            throw ApiException.badRequest("asrFactor must be 1 (standard) or 2 (Hanafi)");
        }
        reminderDayRepository.deleteByUserId(userId);
        outboxService.record(KafkaConfig.TOPIC_PRAYER_SETTINGS_UPDATED, userId.toString(),
                Map.of("userId", userId.toString()));
        PrayerSettings settings = settingsRepository.save(PrayerSettings.builder()
                .userId(userId)
                .latitude(request.latitude())
                .longitude(request.longitude())
                .method(method)
                .timezone(request.timezone())
                .asrFactor(asrFactor)
                .build());
        return toResponse(settings);
    }

    public SettingsResponse settings(UUID userId) {
        return settingsRepository.findById(userId).map(this::toResponse)
                .orElseThrow(() -> ApiException.notFound("no prayer settings saved; PUT /api/v1/prayer/settings first"));
    }

    private SettingsResponse toResponse(PrayerSettings s) {
        return new SettingsResponse(s.getLatitude(), s.getLongitude(), s.getMethod().name(), s.getTimezone(), s.getAsrFactor());
    }

    private record ResolvedLocation(double latitude, double longitude, CalculationMethod method, String timezone, int asrFactor) {
    }

    private ResolvedLocation resolveLocation(UUID userId, Double lat, Double lng, String methodName) {
        Optional<PrayerSettings> saved = userId == null ? Optional.empty() : settingsRepository.findById(userId);
        if ((lat == null || lng == null) && saved.isEmpty()) {
            throw ApiException.badRequest("lat and lng are required until settings are saved");
        }
        CalculationMethod method = methodName == null || methodName.isBlank()
                ? saved.map(PrayerSettings::getMethod).orElse(CalculationMethod.EGYPT)
                : parseMethod(methodName);
        return new ResolvedLocation(
                lat != null ? lat : saved.get().getLatitude(),
                lng != null ? lng : saved.get().getLongitude(),
                method,
                saved.map(PrayerSettings::getTimezone).orElse("UTC"),
                saved.map(PrayerSettings::getAsrFactor).orElse(1));
    }

    static CalculationMethod parseMethod(String name) {
        try {
            return CalculationMethod.valueOf(name.trim().toUpperCase());
        } catch (Exception e) {
            throw ApiException.badRequest("unknown method '" + name + "'; one of MWL, ISNA, EGYPT, MAKKAH, KARACHI");
        }
    }

    static ZoneId parseZone(String timezone) {
        try {
            return ZoneId.of(timezone == null || timezone.isBlank() ? "UTC" : timezone);
        } catch (Exception e) {
            throw ApiException.badRequest("unknown timezone '" + timezone + "'");
        }
    }

    private String compassDirection(double bearing) {
        String[] dirs = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};
        return dirs[(int) Math.round(bearing / 45.0) % 8];
    }
}
