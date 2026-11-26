package com.sabeel.quran.repository;

import com.sabeel.quran.domain.Ayah;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AyahRepository extends JpaRepository<Ayah, Integer> {
    List<Ayah> findBySurahIdOrderByAyahNumber(int surahId);
    List<Ayah> findByPageOrderById(int page);
    List<Ayah> findByJuzOrderById(int juz);
    Optional<Ayah> findBySurahIdAndAyahNumber(int surahId, int ayahNumber);

    @Query("select a from Ayah a where lower(a.textSimple) like lower(concat('%', :q, '%')) or lower(a.textUthmani) like lower(concat('%', :q, '%'))")
    Page<Ayah> search(@Param("q") String query, Pageable pageable);
}
