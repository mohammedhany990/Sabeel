package com.sabeel.community.repository;

import com.sabeel.community.domain.CircleMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CircleMemberRepository extends JpaRepository<CircleMember, UUID> {
    List<CircleMember> findByUserId(UUID userId);

    List<CircleMember> findByCircleId(UUID circleId);

    Optional<CircleMember> findByCircleIdAndUserId(UUID circleId, UUID userId);
}
