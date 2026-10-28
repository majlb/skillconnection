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
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private final ReviewRepository reviews;
    private final BookingRepository bookings;
    private final InstructorRepository instructors;
    private final NotificationService notifications;

    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> forInstructor(Long instructorId, int page, int size) {
        var p = reviews.findByInstructorIdAndStatus(instructorId, Review.Status.PUBLISHED,
                PageRequest.of(page, Math.min(size, 50), Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(p.map(Mapper::review).getContent(), page, size, p.getTotalElements());
    }

    public ReviewDto create(Long customerId, ReviewRequest req) {
        Booking b = bookings.findById(req.bookingId()).orElseThrow(() -> ApiException.notFound("Booking"));
        if (!b.getCustomer().getId().equals(customerId)) throw ApiException.notFound("Booking");
        if (b.getStatus() != Booking.Status.COMPLETED) throw ApiException.badRequest("Only completed sessions can be reviewed");
        if (reviews.existsByBookingId(b.getId())) throw ApiException.conflict("Booking already reviewed");

        Review r = reviews.save(Review.builder().booking(b).customer(b.getCustomer()).instructor(b.getInstructor())
                .rating(req.rating()).comment(req.comment()).build());
        recalculate(b.getInstructor());
        notifications.notify(b.getInstructor().getUser(), Notification.Type.NEW_REVIEW, "New review",
                b.getCustomer().getFullName() + " rated you " + req.rating() + "/5", "/instructor/reviews");
        return Mapper.review(r);
    }

    public ReviewDto reply(Long instructorUserId, Long reviewId, String response) {
        Review r = reviews.findById(reviewId).orElseThrow(() -> ApiException.notFound("Review"));
        if (!r.getInstructor().getUser().getId().equals(instructorUserId)) throw ApiException.forbidden();
        r.setInstructorResponse(response);
        r.setResponseAt(Instant.now());
        return Mapper.review(r);
    }

    // ----- Moderation (admin) -----

    @Transactional(readOnly = true)
    public List<ReviewDto> byStatus(Review.Status status) {
        return reviews.findByStatusOrderByCreatedAtDesc(status).stream().map(Mapper::review).toList();
    }

    public ReviewDto moderate(Long reviewId, Review.Status status) {
        Review r = reviews.findById(reviewId).orElseThrow(() -> ApiException.notFound("Review"));
        r.setStatus(status);
        reviews.flush();
        recalculate(r.getInstructor());
        return Mapper.review(r);
    }

    public void flag(Long reviewId) {
        reviews.findById(reviewId).filter(r -> r.getStatus() == Review.Status.PUBLISHED)
                .ifPresent(r -> r.setStatus(Review.Status.FLAGGED));
    }

    private void recalculate(Instructor instructor) {
        reviews.flush();
        Object[] row = reviews.ratingStats(instructor.getId(), Review.Status.PUBLISHED).get(0);
        double avg = row[0] == null ? 0 : ((Number) row[0]).doubleValue();
        instructor.setRatingAvg(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        instructor.setRatingCount(((Number) row[1]).intValue());
        instructors.save(instructor);
    }
}
