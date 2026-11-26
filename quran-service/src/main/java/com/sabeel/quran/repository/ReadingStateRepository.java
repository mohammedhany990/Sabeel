package com.sabeel.quran.repository;

import com.sabeel.quran.domain.ReadingState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReadingStateRepository extends JpaRepository<ReadingState, UUID> {
}
