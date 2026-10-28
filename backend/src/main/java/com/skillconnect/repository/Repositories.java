package com.skillconnect.repository;

import com.skillconnect.domain.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * All Spring Data repositories, grouped in one file as nested interfaces to keep the module compact.
 * Requires {@code considerNestedRepositories = true} (see JpaConfig).
 */
public final class Repositories {

    private Repositories() {}

    public interface RoleRepository extends JpaRepository<Role, Long> {
        Optional<Role> findByName(String name);
    }

    public interface UserRepository extends JpaRepository<User, Long> {
        Optional<User> findByEmailIgnoreCase(String email);
        boolean existsByEmailIgnoreCase(String email);

        @Query(value = """
                SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS label, count(*) AS value, 0 AS amount
                FROM users WHERE created_at >= :since GROUP BY 1 ORDER BY 1""", nativeQuery = true)
        List<ReportRow> customerGrowth(@Param("since") Instant since);
    }

    public interface InstructorRepository extends JpaRepository<Instructor, Long> {
        Optional<Instructor> findByUserId(Long userId);
        Page<Instructor> findByVerificationStatus(Instructor.VerificationStatus status, Pageable pageable);
        long countByVerificationStatus(Instructor.VerificationStatus status);
    }

    public interface InstructorProfileRepository extends JpaRepository<InstructorProfile, Long> {
        Optional<InstructorProfile> findByInstructorId(Long instructorId);
    }

    public interface DocumentRepository extends JpaRepository<Document, Long> {
        List<Document> findByInstructorId(Long instructorId);
    }

    public interface CategoryRepository extends JpaRepository<Category, Long> {
        List<Category> findByActiveTrueOrderByName();
        Optional<Category> findBySlug(String slug);
    }

    public interface SubjectRepository extends JpaRepository<Subject, Long> {
        List<Subject> findByCategoryIdOrderByName(Long categoryId);
    }

    public interface AgeGroupRepository extends JpaRepository<AgeGroup, Long> {
        List<AgeGroup> findAllByOrderBySortOrder();
    }

    public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long>,
            JpaSpecificationExecutor<ServiceOffering> {
        List<ServiceOffering> findByInstructorIdAndActiveTrue(Long instructorId);
        List<ServiceOffering> findByInstructorIdInAndActiveTrue(Collection<Long> instructorIds);
        List<ServiceOffering> findByInstructorId(Long instructorId);

        @Query("""
                SELECT s.price FROM ServiceOffering s
                WHERE s.active = true AND s.pricingType = :type AND s.category.id = :categoryId
                  AND (:ageGroupId IS NULL OR s.ageGroup.id = :ageGroupId)
                ORDER BY s.price""")
        List<BigDecimal> pricesFor(@Param("categoryId") Long categoryId, @Param("ageGroupId") Long ageGroupId,
                                   @Param("type") ServiceOffering.PricingType type);

        default List<BigDecimal> hourlyPricesFor(Long categoryId, Long ageGroupId) {
            return pricesFor(categoryId, ageGroupId, ServiceOffering.PricingType.HOURLY);
        }
    }

    public interface LocationRepository extends JpaRepository<Location, Long> {}

    public interface InstructorLocationRepository extends JpaRepository<InstructorLocation, Long> {
        List<InstructorLocation> findByInstructorId(Long instructorId);
        List<InstructorLocation> findByInstructorIdIn(Collection<Long> instructorIds);
    }

    public interface AvailabilitySlotRepository extends JpaRepository<AvailabilitySlot, Long> {
        List<AvailabilitySlot> findByInstructorId(Long instructorId);
    }

    public interface BookingRepository extends JpaRepository<Booking, Long> {
        List<Booking> findByCustomerIdAndStatusInOrderByStartAtDesc(Long customerId, Collection<Booking.Status> statuses);
        List<Booking> findByInstructorIdAndStatusInOrderByStartAtAsc(Long instructorId, Collection<Booking.Status> statuses);
        List<Booking> findByInstructorIdAndStartAtBetweenAndStatusIn(Long instructorId, Instant from, Instant to,
                                                                    Collection<Booking.Status> statuses);
        boolean existsByCustomerIdAndInstructorUserId(Long customerId, Long instructorUserId);
        List<Booking> findByCreatedAtAfterAndServiceCategoryIdIn(Instant since, Collection<Long> categoryIds);

        @Query("""
                SELECT count(b) > 0 FROM Booking b
                WHERE b.instructor.id = :instructorId AND b.status IN :active
                  AND b.startAt < :end AND b.endAt > :start AND (:excludeId IS NULL OR b.id <> :excludeId)""")
        boolean overlapExists(@Param("instructorId") Long instructorId, @Param("start") Instant start,
                              @Param("end") Instant end, @Param("excludeId") Long excludeId,
                              @Param("active") Collection<Booking.Status> active);

        default boolean hasOverlap(Long instructorId, Instant start, Instant end, Long excludeId) {
            return overlapExists(instructorId, start, end, excludeId,
                    List.of(Booking.Status.PENDING, Booking.Status.CONFIRMED));
        }

        List<Booking> findByStatusAndReminderSentFalseAndStartAtBetween(Booking.Status status, Instant from, Instant to);

        long countByStatus(Booking.Status status);

        @Query(value = """
                SELECT to_char(date_trunc('month', start_at), 'YYYY-MM') AS label,
                       count(*) AS value, COALESCE(sum(total_price), 0) AS amount
                FROM bookings WHERE instructor_id = :instructorId AND status = 'COMPLETED' AND start_at >= :since
                GROUP BY 1 ORDER BY 1""", nativeQuery = true)
        List<ReportRow> monthlyEarnings(@Param("instructorId") Long instructorId, @Param("since") Instant since);

        @Query(value = """
                SELECT status AS label, count(*) AS value, COALESCE(sum(total_price), 0) AS amount
                FROM bookings WHERE instructor_id = :instructorId GROUP BY status""", nativeQuery = true)
        List<ReportRow> instructorStatusBreakdown(@Param("instructorId") Long instructorId);

        @Query(value = """
                SELECT u.full_name AS label, count(*) AS value, COALESCE(sum(b.total_price), 0) AS amount
                FROM bookings b JOIN instructors i ON i.id = b.instructor_id JOIN users u ON u.id = i.user_id
                WHERE b.status IN ('CONFIRMED','COMPLETED') GROUP BY u.full_name ORDER BY value DESC LIMIT :lim""",
                nativeQuery = true)
        List<ReportRow> mostBookedInstructors(@Param("lim") int limit);

        @Query(value = """
                SELECT c.name AS label, count(*) AS value, COALESCE(sum(b.total_price), 0) AS amount
                FROM bookings b JOIN services s ON s.id = b.service_id JOIN categories c ON c.id = s.category_id
                WHERE b.status IN ('CONFIRMED','COMPLETED') GROUP BY c.name ORDER BY amount DESC""", nativeQuery = true)
        List<ReportRow> revenueByCategory();

        @Query(value = """
                SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS label, count(*) AS value,
                       COALESCE(sum(total_price), 0) AS amount
                FROM bookings WHERE created_at >= :since GROUP BY 1 ORDER BY 1""", nativeQuery = true)
        List<ReportRow> bookingTrends(@Param("since") Instant since);

        @Query(value = "SELECT COALESCE(sum(total_price), 0) FROM bookings WHERE status = 'COMPLETED'", nativeQuery = true)
        BigDecimal totalCompletedRevenue();
    }

    public interface PaymentRepository extends JpaRepository<Payment, Long> {
        List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);
        List<Payment> findByBookingId(Long bookingId);
        List<Payment> findByStatusOrderByCreatedAtDesc(Payment.Status status, Pageable pageable);
    }

    public interface DisputeRepository extends JpaRepository<Dispute, Long> {
        List<Dispute> findByStatusOrderByCreatedAtDesc(Dispute.Status status);
    }

    public interface ReviewRepository extends JpaRepository<Review, Long> {
        Page<Review> findByInstructorIdAndStatus(Long instructorId, Review.Status status, Pageable pageable);
        List<Review> findByStatusOrderByCreatedAtDesc(Review.Status status);
        boolean existsByBookingId(Long bookingId);

        @Query("SELECT avg(r.rating), count(r) FROM Review r WHERE r.instructor.id = :id AND r.status = :status")
        List<Object[]> ratingStats(@Param("id") Long instructorId, @Param("status") Review.Status status);
    }

    public interface MessageRepository extends JpaRepository<Message, Long> {
        boolean existsBySenderIdAndRecipientId(Long senderId, Long recipientId);
        @Query("""
                SELECT m FROM Message m
                WHERE (m.sender.id = :a AND m.recipient.id = :b) OR (m.sender.id = :b AND m.recipient.id = :a)
                ORDER BY m.createdAt ASC""")
        List<Message> conversation(@Param("a") Long userA, @Param("b") Long userB);

        @Query("""
                SELECT m FROM Message m WHERE m.id IN (
                  SELECT max(x.id) FROM Message x WHERE x.sender.id = :uid OR x.recipient.id = :uid
                  GROUP BY CASE WHEN x.sender.id = :uid THEN x.recipient.id ELSE x.sender.id END)
                ORDER BY m.createdAt DESC""")
        List<Message> latestPerConversation(@Param("uid") Long userId);

        @Modifying
        @Query("UPDATE Message m SET m.readAt = CURRENT_TIMESTAMP WHERE m.recipient.id = :me AND m.sender.id = :other AND m.readAt IS NULL")
        int markRead(@Param("me") Long me, @Param("other") Long other);
    }

    public interface NotificationRepository extends JpaRepository<Notification, Long> {
        Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
        long countByUserIdAndReadFalse(Long userId);

        @Modifying
        @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :uid AND n.read = false")
        int markAllRead(@Param("uid") Long userId);
    }

    public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
        List<Favorite> findByUserIdOrderByCreatedAtDesc(Long userId);
        Optional<Favorite> findByUserIdAndInstructorId(Long userId, Long instructorId);
    }

    /** Generic projection for report / chart rows. */
    public interface ReportRow {
        String getLabel();
        Long getValue();
        BigDecimal getAmount();
    }
}
