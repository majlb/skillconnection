package com.skillconnect.service;

import com.skillconnect.domain.*;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.repository.Repositories.*;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service search. Filters run in SQL; distance is refined in memory after a bounding-box pre-filter.
 * At larger scale move geo search to PostGIS (ST_DWithin) and text search to Azure AI Search / OpenSearch.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SearchService {

    private static final int MAX_CANDIDATES = 2000;
    private static final double EARTH_RADIUS_KM = 6371.0;

    private final ServiceOfferingRepository services;
    private final InstructorLocationRepository instructorLocations;
    private final InstructorService instructorService;

    public PageResponse<InstructorSummaryDto> search(SearchQuery q) {
        List<ServiceOffering> matches = services.findAll(spec(q), PageRequest.of(0, MAX_CANDIDATES, Sort.by("id")))
                .getContent();

        Map<Long, Instructor> byInstructor = new LinkedHashMap<>();
        Map<Long, BigDecimal> minPrice = new HashMap<>();
        for (ServiceOffering s : matches) {
            Instructor i = s.getInstructor();
            byInstructor.putIfAbsent(i.getId(), i);
            minPrice.merge(i.getId(), s.getPrice(), BigDecimal::min);
        }

        Map<Long, Double> distances = new HashMap<>();
        if (q.lat() != null && q.lng() != null && !byInstructor.isEmpty()) {
            for (InstructorLocation il : instructorLocations.findByInstructorIdIn(byInstructor.keySet())) {
                double d = haversineKm(q.lat(), q.lng(), il.getLocation().getLatitude(), il.getLocation().getLongitude());
                distances.merge(il.getInstructor().getId(), d, Math::min);
            }
            if (q.radiusKm() != null) {
                byInstructor.keySet().removeIf(id -> !distances.containsKey(id) || distances.get(id) > q.radiusKm());
            }
        }

        List<Instructor> ordered = new ArrayList<>(byInstructor.values());
        ordered.sort(comparator(q.sort(), minPrice, distances));

        int from = Math.min(q.pageOrDefault() * q.sizeOrDefault(), ordered.size());
        int to = Math.min(from + q.sizeOrDefault(), ordered.size());
        List<InstructorSummaryDto> page = instructorService.summarize(ordered.subList(from, to), roundAll(distances));
        return new PageResponse<>(page, q.pageOrDefault(), q.sizeOrDefault(), ordered.size());
    }

    private Comparator<Instructor> comparator(String sort, Map<Long, BigDecimal> minPrice, Map<Long, Double> dist) {
        Comparator<Instructor> byRelevance = Comparator.comparingDouble(
                (Instructor i) -> i.getRatingAvg().doubleValue() * Math.log1p(i.getRatingCount())).reversed();
        return switch (sort == null ? "" : sort) {
            case "price_asc" -> Comparator.comparing(i -> minPrice.get(i.getId()));
            case "price_desc" -> Comparator.comparing((Instructor i) -> minPrice.get(i.getId())).reversed();
            case "rating" -> Comparator.comparing(Instructor::getRatingAvg).reversed();
            case "distance" -> Comparator.comparingDouble(i -> dist.getOrDefault(i.getId(), Double.MAX_VALUE));
            default -> byRelevance;
        };
    }

    private Specification<ServiceOffering> spec(SearchQuery q) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            Join<ServiceOffering, Instructor> instructor = root.join("instructor");
            Join<Instructor, User> user = instructor.join("user");
            Join<ServiceOffering, Category> category = root.join("category");
            Join<ServiceOffering, Subject> subject = root.join("subject", JoinType.LEFT);

            p.add(cb.isTrue(root.get("active")));
            p.add(cb.equal(instructor.get("verificationStatus"), Instructor.VerificationStatus.APPROVED));

            if (q.categoryId() != null) p.add(cb.equal(category.get("id"), q.categoryId()));
            if (q.subjectId() != null) p.add(cb.equal(subject.get("id"), q.subjectId()));
            if (q.ageGroupId() != null) p.add(cb.equal(root.get("ageGroup").get("id"), q.ageGroupId()));
            if (q.minPrice() != null) p.add(cb.greaterThanOrEqualTo(root.get("price"), q.minPrice()));
            if (q.maxPrice() != null) p.add(cb.lessThanOrEqualTo(root.get("price"), q.maxPrice()));
            if (q.minRating() != null) p.add(cb.greaterThanOrEqualTo(instructor.get("ratingAvg"), BigDecimal.valueOf(q.minRating())));
            if (q.mode() != null && q.mode() != ServiceOffering.DeliveryMode.BOTH) {
                p.add(root.get("deliveryMode").in(q.mode(), ServiceOffering.DeliveryMode.BOTH));
            }
            if (q.q() != null && !q.q().isBlank()) {
                String like = "%" + escapeLike(q.q().trim().toLowerCase()) + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like, '\\'),
                        cb.like(cb.lower(user.get("fullName")), like, '\\'),
                        cb.like(cb.lower(category.get("name")), like, '\\'),
                        cb.like(cb.lower(subject.get("name")), like, '\\')));
            }
            if ((q.city() != null && !q.city().isBlank()) || (q.lat() != null && q.lng() != null && q.radiusKm() != null)) {
                Subquery<Long> sq = query.subquery(Long.class);
                Root<InstructorLocation> il = sq.from(InstructorLocation.class);
                Join<InstructorLocation, Location> loc = il.join("location");
                List<Predicate> sp = new ArrayList<>();
                sp.add(cb.equal(il.get("instructor"), instructor));
                if (q.city() != null && !q.city().isBlank()) {
                    sp.add(cb.equal(cb.lower(loc.get("city")), q.city().trim().toLowerCase()));
                }
                if (q.lat() != null && q.lng() != null && q.radiusKm() != null) {
                    double dLat = q.radiusKm() / 111.0;
                    double dLng = q.radiusKm() / (111.0 * Math.max(0.01, Math.cos(Math.toRadians(q.lat()))));
                    sp.add(cb.between(loc.get("latitude"), q.lat() - dLat, q.lat() + dLat));
                    sp.add(cb.between(loc.get("longitude"), q.lng() - dLng, q.lng() + dLng));
                }
                sq.select(il.get("id")).where(sp.toArray(Predicate[]::new));
                p.add(cb.exists(sq));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static Map<Long, Double> roundAll(Map<Long, Double> d) {
        return d.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> Math.round(e.getValue() * 10) / 10.0));
    }
}
