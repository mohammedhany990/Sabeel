package com.sabeel.quran.repository;

import com.sabeel.quran.domain.Khatma;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface KhatmaRepository extends JpaRepository<Khatma, UUID> {
    Optional<Khatma> findFirstByUserIdAndCompletedOnIsNullOrderByStartDateDesc(UUID userId);
    List<Khatma> findByUserIdAndCompletedOnIsNotNullOrderByCompletedOnDesc(UUID userId);
}
