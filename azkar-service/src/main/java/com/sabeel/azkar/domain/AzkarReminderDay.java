package com.sabeel.azkar.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "azkar_reminder_days")
@IdClass(AzkarReminderDay.PK.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AzkarReminderDay {
    @Id
    private UUID userId;
    @Id
    private LocalDate localDate;
    @Id
    private String categoryCode;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class PK implements Serializable {
        private UUID userId;
        private LocalDate localDate;
        private String categoryCode;
    }
}
