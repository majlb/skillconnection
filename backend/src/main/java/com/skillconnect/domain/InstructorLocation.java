package com.skillconnect.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "instructor_locations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InstructorLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instructor_id")
    private Instructor instructor;

    @ManyToOne(fetch = FetchType.EAGER, optional = false, cascade = CascadeType.PERSIST)
    @JoinColumn(name = "location_id")
    private Location location;

    @Column(name = "is_primary")
    private boolean primary;
}
