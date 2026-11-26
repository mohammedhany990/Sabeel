package com.sabeel.quran.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "reciters")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reciter {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true)
    private String reciterKey;

    @Column(nullable = false)
    private String nameAr;

    @Column(nullable = false)
    private String nameEn;

    private String country;

    @Column(nullable = false)
    private String audioBaseUrl;

    private String fullAudioBaseUrl;

    private String style;
}
