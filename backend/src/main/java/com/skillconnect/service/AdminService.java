package com.skillconnect.service;

import com.skillconnect.domain.*;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.dto.Mapper;
import com.skillconnect.exception.ApiException;
import com.skillconnect.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Admin back-office and reporting (instructor earnings included). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository users;
    private final InstructorRepository instructors;
    private final BookingRepository bookings;
    private final PaymentRepository payments;
    private final DisputeRepository disputes;
    private final DocumentRepository documents;
    private final InstructorService instructorService;
    private final PricingService pricing;
    private final NotificationService notifications;
    private final StorageService storage;

    // ---------------- Dashboard & reports ----------------

    public AdminStatsDto stats() {
        return new AdminStatsDto(users.count(), instructors.count(),
                instructors.countByVerificationStatus(Instructor.VerificationStatus.PENDING),
                bookings.count(), bookings.totalCompletedRevenue());
    }

    public Map<String, List<ReportRowDto>> reports() {
        Instant yearAgo = Instant.now().minus(Duration.ofDays(365));
        return Map.of(
                "mostBookedInstructors", bookings.mostBookedInstructors(10).stream().map(Mapper::row).toList(),
                "revenueByCategory", bookings.revenueByCategory().stream().map(Mapper::row).toList(),
                "customerGrowth", users.customerGrowth(yearAgo).stream().map(Mapper::row).toList(),
                "bookingTrends", bookings.bookingTrends(Instant.now().minus(Duration.ofDays(90))).stream().map(Mapper::row).toList());
    }

    public EarningsDto earnings(Long instructorUserId) {
        Instructor i = instructorService.requireByUser(instructorUserId);
        List<ReportRowDto> monthly = bookings.monthlyEarnings(i.getId(), Instant.now().minus(Duration.ofDays(365)))
                .stream().map(Mapper::row).toList();
        List<ReportRowDto> breakdown = bookings.instructorStatusBreakdown(i.getId()).stream().map(Mapper::row).toList();
        BigDecimal gross = monthly.stream().map(ReportRowDto::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long completed = breakdown.stream().filter(r -> r.label().equals("COMPLETED")).mapToLong(ReportRowDto::value).sum();
        long upcoming = breakdown.stream().filter(r -> r.label().equals("CONFIRMED") || r.label().equals("PENDING"))
                .mapToLong(ReportRowDto::value).sum();
        List<PaymentDto> payouts = payments.findByUserIdOrderByCreatedAtDesc(instructorUserId).stream()
                .filter(p -> p.getType() == Payment.Type.PAYOUT).map(Mapper::payment).toList();
        return new EarningsDto(gross, gross.subtract(pricing.platformFee(gross)), completed, upcoming, monthly, breakdown, payouts);
    }

    // ---------------- Instructor approval ----------------

    public PageResponse<InstructorSummaryDto> instructorsByStatus(Instructor.VerificationStatus status, int page, int size) {
        var p = instructors.findByVerificationStatus(status, PageRequest.of(page, Math.min(size, 100), Sort.by("createdAt")));
        return new PageResponse<>(instructorService.summarize(p.getContent(), Map.of()), page, size, p.getTotalElements());
    }

    public List<DocumentDto> instructorDocuments(Long instructorId) {
        return documents.findByInstructorId(instructorId).stream().map(Mapper::document).toList();
    }

    public java.nio.file.Path documentFile(Long documentId) {
        Document d = documents.findById(documentId).orElseThrow(() -> ApiException.notFound("Document"));
        return storage.resolve(StorageService.Bucket.DOCUMENTS, d.getFileUrl());
    }

    @Transactional
    public void setVerification(Long instructorId, Instructor.VerificationStatus status) {
        Instructor i = instructors.findById(instructorId).orElseThrow(() -> ApiException.notFound("Instructor"));
        i.setVerificationStatus(status);
        documents.findByInstructorId(instructorId).forEach(d -> {
            if (status == Instructor.VerificationStatus.APPROVED) d.setStatus(Document.Status.APPROVED);
            if (status == Instructor.VerificationStatus.REJECTED) d.setStatus(Document.Status.REJECTED);
        });
        notifications.notify(i.getUser(), Notification.Type.SYSTEM, "Verification " + status.name().toLowerCase(),
                "Your instructor profile status is now " + status + ".", "/instructor");
    }

    @Transactional
    public void setUserEnabled(Long userId, boolean enabled) {
        users.findById(userId).orElseThrow(() -> ApiException.notFound("User")).setEnabled(enabled);
    }

    // ---------------- Disputes ----------------

    @Transactional
    public DisputeDto openDispute(Long userId, DisputeRequest req) {
        Booking b = bookings.findById(req.bookingId()).orElseThrow(() -> ApiException.notFound("Booking"));
        if (!b.getCustomer().getId().equals(userId) && !b.getInstructor().getUser().getId().equals(userId)) {
            throw ApiException.notFound("Booking");
        }
        return Mapper.dispute(disputes.save(Dispute.builder().booking(b).raisedBy(users.getReferenceById(userId))
                .reason(req.reason()).build()));
    }

    public List<DisputeDto> disputes(Dispute.Status status) {
        return disputes.findByStatusOrderByCreatedAtDesc(status).stream().map(Mapper::dispute).toList();
    }

    @Transactional
    public DisputeDto resolve(Long id, ResolveDisputeRequest req) {
        Dispute d = disputes.findById(id).orElseThrow(() -> ApiException.notFound("Dispute"));
        d.setStatus(req.status());
        d.setResolution(req.resolution());
        return Mapper.dispute(d);
    }

    // ---------------- Payments ----------------

    public List<PaymentDto> recentPayments(Payment.Status status) {
        return payments.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(0, 200)).stream().map(Mapper::payment).toList();
    }

    @Transactional
    public PaymentDto markPayoutPaid(Long paymentId) {
        Payment p = payments.findById(paymentId).orElseThrow(() -> ApiException.notFound("Payment"));
        if (p.getType() != Payment.Type.PAYOUT || p.getStatus() != Payment.Status.PENDING) {
            throw ApiException.badRequest("Only pending payouts can be settled");
        }
        p.setStatus(Payment.Status.SUCCEEDED);
        return Mapper.payment(p);
    }
}
