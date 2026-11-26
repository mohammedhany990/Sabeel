package com.sabeel.azkar.repository;

import com.sabeel.azkar.domain.AzkarCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AzkarCategoryRepository extends JpaRepository<AzkarCategory, Integer> {
    Optional<AzkarCategory> findByCode(String code);
}
