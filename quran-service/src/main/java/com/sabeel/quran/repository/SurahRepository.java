package com.sabeel.quran.repository;

import com.sabeel.quran.domain.Surah;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurahRepository extends JpaRepository<Surah, Integer> {
}
