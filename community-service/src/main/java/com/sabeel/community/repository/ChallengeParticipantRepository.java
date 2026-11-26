package com.sabeel.community.repository;

import com.sabeel.community.domain.ChallengeParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChallengeParticipantRepository extends JpaRepository<ChallengeParticipant, UUID> {
    Optional<ChallengeParticipant> findByChallengeIdAndUserId(UUID challengeId, UUID userId);

    List<ChallengeParticipant> findByUserId(UUID userId);

    long countByChallengeId(UUID challengeId);
}
