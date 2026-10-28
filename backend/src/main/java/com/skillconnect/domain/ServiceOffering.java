package com.skillconnect.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

/** A bookable offering created by an instructor (table: services). */
@Entity
@Table(name = "services")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceOffering {

    public enum DeliveryMode { ONLINE, IN_PERSON, BOTH }
    public enum PricingType { HOURLY, PACKAGE, GROUP }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instructor_id")
    private Instructor instructor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "age_group_id")
    private AgeGroup ageGroup;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliveryMode deliveryMode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PricingType pricingType;

    @Column(nullable = false)
    private BigDecimal price;

    private Integer packageSessions;
    private BigDecimal groupPricePerStudent;

    @Builder.Default
    private String durationOptions = "60";

    @Builder.Default
    private int maxStudents = 1;

    @Builder.Default
    private String currency = "USD";

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private Instant createdAt = Instant.now();

    public List<Integer> durationList() {
        return Arrays.stream(durationOptions.split(","))
                .map(String::trim).filter(s -> !s.isEmpty())
                .map(Integer::valueOf).toList();
    }
}
