package com.sabeel.quran.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "surahs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Surah {
    @Id
    private Integer id;

    @Column(nullable = false)
    private String nameAr;

    @Column(nullable = false)
    private String nameEn;

    @Column(nullable = false)
    private String transliteration;

    @Column(nullable = false)
    private String revelationType;

    @Column(nullable = false)
    private int ayahCount;

    private Integer startPage;
    private Integer startJuz;
}
