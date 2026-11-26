package com.sabeel.quran.repository;

import com.sabeel.quran.domain.Reciter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReciterRepository extends JpaRepository<Reciter, Integer> {
    Optional<Reciter> findByReciterKey(String reciterKey);

    Optional<Reciter> findFirstByNameEnAndReciterKeyIsNull(String nameEn);
}
