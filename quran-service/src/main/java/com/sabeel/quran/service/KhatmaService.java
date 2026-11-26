package com.sabeel.quran.service;

import com.sabeel.quran.domain.Khatma;
import com.sabeel.quran.dto.KhatmaResponse;
import com.sabeel.quran.exception.ApiException;
import com.sabeel.quran.repository.KhatmaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KhatmaService {
    public static final int TOTAL_PAGES = 604;

    private final KhatmaRepository repository;

    @Transactional
    public KhatmaResponse start(UUID userId, int days, LocalDate today) {
        if (repository.findFirstByUserIdAndCompletedOnIsNullOrderByStartDateDesc(userId).isPresent()) {
            throw ApiException.conflict("a khatma is already in progress");
        }
        Khatma khatma = repository.save(Khatma.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .startDate(today)
                .targetDate(today.plusDays(days))
                .currentPage(0)
                .build());
        return toResponse(khatma, today);
    }

    @Transactional(readOnly = true)
    public Optional<KhatmaResponse> active(UUID userId, LocalDate today) {
        return repository.findFirstByUserIdAndCompletedOnIsNullOrderByStartDateDesc(userId).map(k -> toResponse(k, today));
    }

    @Transactional
    public KhatmaResponse progress(UUID userId, int page, LocalDate today) {
        Khatma khatma = repository.findFirstByUserIdAndCompletedOnIsNullOrderByStartDateDesc(userId)
                .orElseThrow(() -> ApiException.notFound("no khatma in progress"));
        khatma.setCurrentPage(page);
        if (page >= TOTAL_PAGES) {
            khatma.setCompletedOn(today);
        }
        return toResponse(repository.save(khatma), today);
    }

    @Transactional
    public void abandon(UUID userId) {
        repository.findFirstByUserIdAndCompletedOnIsNullOrderByStartDateDesc(userId).ifPresent(repository::delete);
    }

    @Transactional(readOnly = true)
    public int completedCount(UUID userId) {
        return repository.findByUserIdAndCompletedOnIsNotNullOrderByCompletedOnDesc(userId).size();
    }

    static KhatmaResponse toResponse(Khatma k, LocalDate today) {
        int remaining = TOTAL_PAGES - k.getCurrentPage();
        int daysLeft = (int) Math.max(0, ChronoUnit.DAYS.between(today, k.getTargetDate()));
        int perDay = remaining == 0 ? 0 : (int) Math.ceil(remaining / (double) Math.max(1, daysLeft));
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(k.getStartDate(), k.getTargetDate()));
        long elapsed = Math.max(0, ChronoUnit.DAYS.between(k.getStartDate(), today));
        double expectedPages = Math.min(TOTAL_PAGES, TOTAL_PAGES * (double) elapsed / totalDays);
        boolean completed = k.getCompletedOn() != null;
        return new KhatmaResponse(k.getId().toString(), k.getStartDate().toString(), k.getTargetDate().toString(),
                k.getCurrentPage(), TOTAL_PAGES, (int) Math.floor(k.getCurrentPage() * 100.0 / TOTAL_PAGES),
                daysLeft, perDay, completed || k.getCurrentPage() >= expectedPages, completed,
                completed ? k.getCompletedOn().toString() : null);
    }

    public static LocalDate todayUtc() {
        return LocalDate.now(ZoneOffset.UTC);
    }
}
