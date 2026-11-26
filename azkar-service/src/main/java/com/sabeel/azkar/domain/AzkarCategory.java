package com.sabeel.azkar.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "azkar_categories")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AzkarCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false)
    private String nameEn;

    @Column(nullable = false)
    private String nameAr;

    @Column(nullable = false)
    private int sortOrder;
}
