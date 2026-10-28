package com.skillconnect.service;

import com.skillconnect.domain.*;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.dto.Mapper;
import com.skillconnect.exception.ApiException;
import com.skillconnect.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/**
 * Booking lifecycle:  PENDING → CONFIRMED → COMPLETED
 *                        ↘ REJECTED   ↘ CANCELLED
 */
@Service
@RequiredArgsConstructor
@Transactional
public class BookingService {

    private static final Duration FREE_CANCELLATION_WINDOW = Duration.ofHours(24);

    private final BookingRepository bookings;
    private final ServiceOfferingRepository services;
    private final UserRepository users;
    private final InstructorLocationRepository instructorLocations;
    private final InstructorService instructorService;
    private final AvailabilityService availability;
    private final PricingService pricing;
    private final PaymentService paymentService;
    private final NotificationService notifications;
    private final MeetingService meetings;

    // ---------------- Pre-booking ----------------

    @Transactional(readOnly = true)
    public QuoteDto quote(QuoteRequest req) {
        ServiceOffering s = activeService(req.serviceId());
        return pricing.quote(s, req.durationMinutes(), req.participants() == null ? 1 : req.participants());
    }

    @Transactional(readOnly = true)
    public List<TimeSlotDto> openSlots(Long instructorId, Long serviceId, LocalDate from, LocalDate to, Integer duration) {
        Instructor i = instructorService.requirePublic(instructorId);
        int minutes = duration != null ? duration : 60;
        if (serviceId != null) {
            ServiceOffering s = activeService(serviceId);
            if (duration == null) minutes = s.durationList().get(0);
        }
        return availability.openSlots(i, from, to, minutes);
    }

    // ---------------- Create ----------------

    public BookingDto create(Long customerId, CreateBookingRequest req) {
        User customer = users.findById(customerId).orElseThrow(() -> ApiException.notFound("User"));
        ServiceOffering s = activeService(req.serviceId());
        Instructor instructor = s.getInstructor();
        if (instructor.getVerificationStatus() != Instructor.VerificationStatus.APPROVED) {
            throw ApiException.badRequest("Instructor is not accepting bookings");
        }
        if (instructor.getUser().getId().equals(customerId)) {
            throw ApiException.badRequest("You cannot book your own service");
        }
        if (s.getDeliveryMode() != ServiceOffering.DeliveryMode.BOTH && s.getDeliveryMode() != req.deliveryMode()) {
            throw ApiException.badRequest("This service is only offered " + s.getDeliveryMode());
        }
        if (req.deliveryMode() == ServiceOffering.DeliveryMode.BOTH) {
            throw ApiException.badRequest("Choose ONLINE or IN_PERSON");
        }

        Location location = null;
        if (req.deliveryMode() == ServiceOffering.DeliveryMode.IN_PERSON) {
            location = instructorLocations.findByInstructorId(instructor.getId()).stream()
                    .map(InstructorLocation::getLocation)
                    .filter(l -> l.getId().equals(req.locationId()))
                    .findFirst().orElseThrow(() -> ApiException.badRequest("Select one of the instructor's locations"));
        }

        int participants = req.participants() == null ? 1 : req.participants();
        QuoteDto quote = pricing.quote(s, req.durationMinutes(), participants);
        Instant start = req.startAt();
        Instant end = start.plus(Duration.ofMinutes(req.durationMinutes()));
        if (!availability.isBookable(instructor, start, end, null)) {
            throw ApiException.conflict("Selected time is no longer available");
        }

        Booking b = bookings.saveAndFlush(Booking.builder()
                .customer(customer).instructor(instructor).service(s).location(location)
                .startAt(start).endAt(end).durationMinutes(req.durationMinutes()).participants(participants)
                .deliveryMode(req.deliveryMode()).totalPrice(quote.total()).depositAmount(quote.deposit())
                .currency(quote.currency()).notes(req.notes())
                .build());

        paymentService.chargeForBooking(b, req.paymentMethod(), req.paymentToken(), req.payDepositOnly());

        notifications.notify(instructor.getUser(), Notification.Type.BOOKING_REQUESTED, "New booking request",
                customer.getFullName() + " requested " + s.getName() + " on " + start, "/instructor/bookings");
        return Mapper.booking(b);
    }

    // ---------------- Instructor actions ----------------

    public BookingDto accept(Long instructorUserId, Long bookingId) {
        Booking b = ownedByInstructor(instructorUserId, bookingId);
        requireStatus(b, Booking.Status.PENDING);
        b.setStatus(Booking.Status.CONFIRMED);
        if (b.getDeliveryMode() == ServiceOffering.DeliveryMode.ONLINE && b.getMeetingUrl() == null) {
            b.setMeetingUrl(meetings.createMeetingUrl(b));
        }
        notifications.notify(b.getCustomer(), Notification.Type.BOOKING_CONFIRMED, "Booking confirmed",
                b.getService().getName() + " on " + b.getStartAt() + " is confirmed.", "/dashboard");
        return Mapper.booking(b);
    }

    public BookingDto reject(Long instructorUserId, Long bookingId, String reason) {
        Booking b = ownedByInstructor(instructorUserId, bookingId);
        requireStatus(b, Booking.Status.PENDING);
        b.setStatus(Booking.Status.REJECTED);
        b.setCancellationReason(reason);
        paymentService.refund(b, false);
        notifications.notify(b.getCustomer(), Notification.Type.BOOKING_REJECTED, "Booking declined",
                "Your request for " + b.getService().getName() + " was declined. A full refund has been issued.", "/dashboard");
        return Mapper.booking(b);
    }

    public BookingDto markAttendance(Long instructorUserId, Long bookingId, boolean attended) {
        Booking b = ownedByInstructor(instructorUserId, bookingId);
        requireStatus(b, Booking.Status.CONFIRMED);
        if (b.getStartAt().isAfter(Instant.now())) {
            throw ApiException.badRequest("Session has not started yet");
        }
        b.setAttended(attended);
        b.setStatus(Booking.Status.COMPLETED);
        paymentService.chargeBalanceIfDue(b);
        paymentService.recordPayout(b);
        return Mapper.booking(b);
    }

    // ---------------- Shared actions ----------------

    public BookingDto cancel(Long userId, Long bookingId, String reason) {
        Booking b = participantBooking(userId, bookingId);
        if (b.getStatus() != Booking.Status.PENDING && b.getStatus() != Booking.Status.CONFIRMED) {
            throw ApiException.badRequest("Booking cannot be cancelled in status " + b.getStatus());
        }
        boolean byInstructor = b.getInstructor().getUser().getId().equals(userId);
        boolean late = Duration.between(Instant.now(), b.getStartAt()).compareTo(FREE_CANCELLATION_WINDOW) < 0;
        boolean wasConfirmed = b.getStatus() == Booking.Status.CONFIRMED;
        b.setStatus(Booking.Status.CANCELLED);
        b.setCancellationReason(reason);
        // Late customer cancellation of a confirmed session forfeits the deposit; everything else is fully refunded.
        paymentService.refund(b, !byInstructor && late && wasConfirmed);

        User other = byInstructor ? b.getCustomer() : b.getInstructor().getUser();
        notifications.notify(other, Notification.Type.BOOKING_CANCELLED, "Booking cancelled",
                b.getService().getName() + " on " + b.getStartAt() + " was cancelled."
                        + (reason == null || reason.isBlank() ? "" : " Reason: " + reason), "/dashboard");
        return Mapper.booking(b);
    }

    public BookingDto reschedule(Long userId, Long bookingId, Instant newStart) {
        Booking b = participantBooking(userId, bookingId);
        if (b.getStatus() != Booking.Status.PENDING && b.getStatus() != Booking.Status.CONFIRMED) {
            throw ApiException.badRequest("Booking cannot be rescheduled in status " + b.getStatus());
        }
        Instant newEnd = newStart.plus(Duration.ofMinutes(b.getDurationMinutes()));
        if (!availability.isBookable(b.getInstructor(), newStart, newEnd, b.getId())) {
            throw ApiException.conflict("Selected time is not available");
        }
        boolean byInstructor = b.getInstructor().getUser().getId().equals(userId);
        b.setStartAt(newStart);
        b.setEndAt(newEnd);
        b.setReminderSent(false);
        // A customer-initiated change needs the instructor to re-confirm.
        if (!byInstructor) b.setStatus(Booking.Status.PENDING);
        bookings.flush();

        User other = byInstructor ? b.getCustomer() : b.getInstructor().getUser();
        notifications.notify(other, Notification.Type.BOOKING_RESCHEDULED, "Booking rescheduled",
                b.getService().getName() + " moved to " + newStart, byInstructor ? "/dashboard" : "/instructor/bookings");
        return Mapper.booking(b);
    }

    // ---------------- Queries ----------------

    @Transactional(readOnly = true)
    public List<BookingDto> customerBookings(Long customerId, String bucket) {
        return bookings.findByCustomerIdAndStatusInOrderByStartAtDesc(customerId, statuses(bucket)).stream()
                .filter(b -> !"upcoming".equals(bucket) || b.getEndAt().isAfter(Instant.now()))
                .map(Mapper::booking).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingDto> instructorBookings(Long instructorUserId, String bucket) {
        Instructor i = instructorService.requireByUser(instructorUserId);
        return bookings.findByInstructorIdAndStatusInOrderByStartAtAsc(i.getId(), statuses(bucket)).stream()
                .map(Mapper::booking).toList();
    }

    @Transactional(readOnly = true)
    public BookingDto get(Long userId, Long bookingId, boolean admin) {
        return Mapper.booking(admin ? find(bookingId) : participantBooking(userId, bookingId));
    }

    @Transactional(readOnly = true)
    public String ics(Long userId, Long bookingId) {
        return meetings.toIcs(participantBooking(userId, bookingId));
    }

    // ---------------- Helpers ----------------

    private static List<Booking.Status> statuses(String bucket) {
        return switch (bucket == null ? "all" : bucket) {
            case "upcoming" -> List.of(Booking.Status.PENDING, Booking.Status.CONFIRMED);
            case "pending" -> List.of(Booking.Status.PENDING);
            case "completed" -> List.of(Booking.Status.COMPLETED);
            case "cancelled" -> List.of(Booking.Status.CANCELLED, Booking.Status.REJECTED);
            default -> List.of(Booking.Status.values());
        };
    }

    private ServiceOffering activeService(Long id) {
        return services.findById(id).filter(ServiceOffering::isActive)
                .orElseThrow(() -> ApiException.notFound("Service"));
    }

    private Booking find(Long id) {
        return bookings.findById(id).orElseThrow(() -> ApiException.notFound("Booking"));
    }

    private Booking ownedByInstructor(Long instructorUserId, Long bookingId) {
        Booking b = find(bookingId);
        if (!b.getInstructor().getUser().getId().equals(instructorUserId)) throw ApiException.forbidden();
        return b;
    }

    private Booking participantBooking(Long userId, Long bookingId) {
        Booking b = find(bookingId);
        if (!Objects.equals(b.getCustomer().getId(), userId) && !Objects.equals(b.getInstructor().getUser().getId(), userId)) {
            // 404 rather than 403 so booking IDs can't be probed.
            throw ApiException.notFound("Booking");
        }
        return b;
    }

    private static void requireStatus(Booking b, Booking.Status expected) {
        if (b.getStatus() != expected) {
            throw ApiException.badRequest("Booking must be " + expected + " but is " + b.getStatus());
        }
    }
}
