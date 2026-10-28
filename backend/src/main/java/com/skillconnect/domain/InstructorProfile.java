package com.skillconnect.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "instructor_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InstructorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instructor_id", unique = true)
    private Instructor instructor;

    private String bio;
    private Integer experienceYears;
    private String experience;
    private String education;
    private String languages;
    private String teachingMethods;
    private String serviceDescription;
}
