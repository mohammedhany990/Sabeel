package com.sabeel.azkar.repository;

import com.sabeel.azkar.domain.AzkarItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AzkarItemRepository extends JpaRepository<AzkarItem, Integer> {
    List<AzkarItem> findByCategoryCodeOrderBySortOrder(String categoryCode);
    long countByCategoryCode(String categoryCode);
}
