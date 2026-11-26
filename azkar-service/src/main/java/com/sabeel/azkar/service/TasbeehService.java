package com.sabeel.azkar.service;

import com.sabeel.azkar.domain.TasbeehCount;
import com.sabeel.azkar.dto.TasbeehResponse;
import com.sabeel.azkar.exception.ApiException;
import com.sabeel.azkar.repository.TasbeehCountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TasbeehService {
    public static final List<String> PHRASES = List.of(
            "SUBHANALLAH", "ALHAMDULILLAH", "ALLAHU_AKBAR", "LA_ILAHA_ILLALLAH", "ASTAGHFIRULLAH", "SALAWAT");

    private final TasbeehCountRepository repository;

    @Transactional
    public TasbeehResponse add(UUID userId, LocalDate today, String phrase, int count) {
        String code = phrase.toUpperCase();
        if (!PHRASES.contains(code)) {
            throw ApiException.badRequest("unknown tasbeeh phrase");
        }
        TasbeehCount.PK key = new TasbeehCount.PK(userId, today, code);
        TasbeehCount row = repository.findById(key).orElseGet(() -> new TasbeehCount(userId, today, code, 0));
        row.setTotal(row.getTotal() + count);
        repository.save(row);
        return summary(userId, today);
    }

    @Transactional(readOnly = true)
    public TasbeehResponse summary(UUID userId, LocalDate today) {
        Map<String, Long> todayMap = zero();
        Map<String, Long> lifetime = zero();
        for (TasbeehCount c : repository.findByUserId(userId)) {
            lifetime.merge(c.getPhrase(), c.getTotal(), Long::sum);
            if (c.getLogDate().equals(today)) {
                todayMap.merge(c.getPhrase(), c.getTotal(), Long::sum);
            }
        }
        return new TasbeehResponse(today.toString(), todayMap, lifetime);
    }

    private static Map<String, Long> zero() {
        Map<String, Long> m = new LinkedHashMap<>();
        PHRASES.forEach(p -> m.put(p, 0L));
        return m;
    }
}
