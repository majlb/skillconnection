package com.skillconnect.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "instructors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Instructor {

    public enum VerificationStatus { PENDING, APPROVED, REJECTED, SUSPENDED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    private String headline;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    @Builder.Default
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Builder.Default
    private int ratingCount = 0;

    @Builder.Default
    private int serviceRadiusKm = 10;

    /** IANA zone in which availability windows are defined. */
    @Builder.Default
    private String timeZone = "UTC";

    @OneToOne(mappedBy = "instructor", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private InstructorProfile profile;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
