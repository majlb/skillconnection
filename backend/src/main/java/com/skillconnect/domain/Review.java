package com.skillconnect.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Review {

    public enum Status { PUBLISHED, FLAGGED, HIDDEN }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", unique = true)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instructor_id")
    private Instructor instructor;

    private int rating;
    private String comment;
    private String instructorResponse;
    private Instant responseAt;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.PUBLISHED;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
