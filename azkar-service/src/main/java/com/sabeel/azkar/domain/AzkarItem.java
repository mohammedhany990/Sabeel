package com.sabeel.azkar.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "azkar_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AzkarItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private AzkarCategory category;

    @Column(nullable = false, columnDefinition = "text")
    private String textAr;

    @Column(nullable = false)
    private int repeatTarget;

    @Column(nullable = false)
    private int sortOrder;

    private String reference;
}
