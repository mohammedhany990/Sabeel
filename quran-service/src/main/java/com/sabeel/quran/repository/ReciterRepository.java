package com.sabeel.quran.repository;

import com.sabeel.quran.domain.Reciter;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReciterRepository extends JpaRepository<Reciter, Integer> {
}
