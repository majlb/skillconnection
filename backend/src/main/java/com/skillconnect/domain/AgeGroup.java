package com.skillconnect.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "age_groups")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AgeGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String label;

    private int minAge;
    private Integer maxAge;
    private int sortOrder;
}
