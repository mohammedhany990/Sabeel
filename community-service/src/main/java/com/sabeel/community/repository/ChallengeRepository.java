package com.sabeel.community.repository;

import com.sabeel.community.domain.Challenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ChallengeRepository extends JpaRepository<Challenge, UUID> {
    boolean existsByCode(String code);

    List<Challenge> findByStartsAtBeforeAndEndsAtAfterOrderByEndsAtAsc(Instant before, Instant after);

    List<Challenge> findByMetricAndStartsAtBeforeAndEndsAtAfter(Challenge.Metric metric, Instant before, Instant after);
}
