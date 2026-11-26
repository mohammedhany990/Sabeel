package com.sabeel.revision.repository;

import com.sabeel.revision.domain.RevisionItem;
import com.sabeel.revision.domain.RevisionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RevisionItemRepository extends JpaRepository<RevisionItem, UUID> {
    List<RevisionItem> findByUserIdAndStatusOrderByNextRevisionDate(UUID userId, RevisionStatus status);
    List<RevisionItem> findByUserIdAndNextRevisionDateBetweenOrderByNextRevisionDate(UUID userId, LocalDate from, LocalDate to);
    List<RevisionItem> findByNextRevisionDateLessThanEqualAndStatusNot(LocalDate date, RevisionStatus status);
    Optional<RevisionItem> findByIdAndUserId(UUID id, UUID userId);
    Optional<RevisionItem> findByUserIdAndSurahIdAndFromAyahAndToAyah(UUID userId, int surahId, int fromAyah, int toAyah);
    long countByUserIdAndStatus(UUID userId, RevisionStatus status);
}
