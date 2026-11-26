package com.sabeel.azkar.repository;

import com.sabeel.azkar.domain.TasbeehCount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TasbeehCountRepository extends JpaRepository<TasbeehCount, TasbeehCount.PK> {
    List<TasbeehCount> findByUserId(UUID userId);
}
