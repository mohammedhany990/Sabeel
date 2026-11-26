package com.sabeel.quran.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ayahs", uniqueConstraints = @UniqueConstraint(columnNames = {"surahId", "ayahNumber"}),
        indexes = @Index(name = "idx_ayah_page", columnList = "page"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ayah {
    @Id
    private Integer id;

    @Column(nullable = false)
    private int surahId;

    @Column(nullable = false)
    private int ayahNumber;

    @Column(nullable = false, columnDefinition = "text")
    private String textUthmani;

    @Column(nullable = false, columnDefinition = "text")
    private String textSimple;

    private Integer page;
    private Integer juz;
    private Integer hizb;
}
