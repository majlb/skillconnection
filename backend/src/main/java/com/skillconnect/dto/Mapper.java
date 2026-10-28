package com.skillconnect.dto;

import com.skillconnect.domain.*;
import com.skillconnect.dto.Dtos.*;

import java.math.BigDecimal;
import java.util.*;

/** Entity → DTO mapping. Must be called inside a transaction (lazy associations). */
public final class Mapper {

    private Mapper() {}

    public static UserDto user(User u, Long instructorId) {
        Set<String> roles = new TreeSet<>();
        u.getRoles().forEach(r -> roles.add(r.getName()));
        return new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getAge(), u.getGender(), u.getPhone(),
                u.getAvatarUrl(), u.getPreferredLanguage(), roles, instructorId);
    }

    public static CategoryDto category(Category c) {
        return new CategoryDto(c.getId(), c.getName(), c.getSlug(), c.getIcon(), c.isActive());
    }

    public static SubjectDto subject(Subject s) {
        return new SubjectDto(s.getId(), s.getCategory().getId(), s.getName(), s.getSlug());
    }

    public static AgeGroupDto ageGroup(AgeGroup a) {
        return new AgeGroupDto(a.getId(), a.getCode(), a.getLabel(), a.getMinAge(), a.getMaxAge(), a.getSortOrder());
    }

    public static LocationDto location(Location l, boolean primary) {
        if (l == null) return null;
        return new LocationDto(l.getId(), l.getLabel(), l.getAddress(), l.getCity(), l.getCountry(),
                l.getLatitude(), l.getLongitude(), primary);
    }

    public static ServiceDto service(ServiceOffering s) {
        return new ServiceDto(s.getId(), s.getInstructor().getId(), s.getCategory().getId(), s.getCategory().getName(),
                s.getSubject() == null ? null : s.getSubject().getId(),
                s.getSubject() == null ? null : s.getSubject().getName(),
                s.getAgeGroup() == null ? null : s.getAgeGroup().getId(),
                s.getAgeGroup() == null ? null : s.getAgeGroup().getLabel(),
                s.getName(), s.getDescription(), s.getDeliveryMode(), s.getPricingType(), s.getPrice(),
                s.getPackageSessions(), s.getGroupPricePerStudent(), s.durationList(), s.getMaxStudents(),
                s.getCurrency(), s.isActive());
    }

    public static InstructorSummaryDto instructorSummary(Instructor i, List<ServiceOffering> services,
                                                         List<InstructorLocation> locations, Double distanceKm) {
        BigDecimal minPrice = services.stream().filter(ServiceOffering::isActive).map(ServiceOffering::getPrice)
                .min(Comparator.naturalOrder()).orElse(null);
        List<String> categories = services.stream().map(s -> s.getCategory().getName()).distinct().toList();
        Set<String> modes = new TreeSet<>();
        services.forEach(s -> modes.add(s.getDeliveryMode().name()));
        List<LocationDto> locs = locations.stream().map(l -> location(l.getLocation(), l.isPrimary())).toList();
        User u = i.getUser();
        return new InstructorSummaryDto(i.getId(), u.getId(), u.getFullName(), u.getAvatarUrl(), i.getHeadline(),
                i.getRatingAvg(), i.getRatingCount(), minPrice, categories, modes, locs, distanceKm,
                i.getVerificationStatus() == Instructor.VerificationStatus.APPROVED);
    }

    public static AvailabilitySlotDto slot(AvailabilitySlot s) {
        return new AvailabilitySlotDto(s.getId(), s.getSlotType(), s.getDayOfWeek(), s.getStartTime(), s.getEndTime(),
                s.getStartDate(), s.getEndDate(), s.getLocation() == null ? null : s.getLocation().getId(), s.getNote());
    }

    public static BookingDto booking(Booking b) {
        return new BookingDto(b.getId(), b.getService().getId(), b.getService().getName(), b.getInstructor().getId(),
                b.getInstructor().getUser().getId(), b.getInstructor().getUser().getFullName(),
                b.getCustomer().getId(), b.getCustomer().getFullName(), b.getStartAt(), b.getEndAt(),
                b.getDurationMinutes(), b.getParticipants(), b.getDeliveryMode(), b.getStatus(), b.getTotalPrice(),
                b.getDepositAmount(), b.getCurrency(), b.getMeetingUrl(), location(b.getLocation(), false),
                b.getAttended(), b.getNotes(), b.getCancellationReason());
    }

    public static PaymentDto payment(Payment p) {
        return new PaymentDto(p.getId(), p.getBooking() == null ? null : p.getBooking().getId(), p.getAmount(),
                p.getCurrency(), p.getMethod(), p.getType(), p.getStatus(), p.getCreatedAt());
    }

    public static ReviewDto review(Review r) {
        return new ReviewDto(r.getId(), r.getBooking().getId(), r.getInstructor().getId(),
                r.getCustomer().getFullName(), r.getCustomer().getAvatarUrl(), r.getRating(), r.getComment(),
                r.getInstructorResponse(), r.getResponseAt(), r.getStatus(), r.getCreatedAt());
    }

    public static MessageDto message(Message m) {
        return new MessageDto(m.getId(), m.getSender().getId(), m.getRecipient().getId(), m.getContent(),
                m.getCreatedAt(), m.getReadAt());
    }

    public static NotificationDto notification(Notification n) {
        return new NotificationDto(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(), n.isRead(),
                n.getCreatedAt());
    }

    public static DocumentDto document(Document d) {
        return new DocumentDto(d.getId(), d.getDocType(), d.getFileName(), d.getStatus(), d.getCreatedAt());
    }

    public static DisputeDto dispute(Dispute d) {
        return new DisputeDto(d.getId(), d.getBooking().getId(), d.getRaisedBy().getFullName(), d.getReason(),
                d.getStatus(), d.getResolution(), d.getCreatedAt());
    }

    public static ReportRowDto row(com.skillconnect.repository.Repositories.ReportRow r) {
        return new ReportRowDto(r.getLabel(), r.getValue() == null ? 0 : r.getValue(),
                r.getAmount() == null ? BigDecimal.ZERO : r.getAmount());
    }
}
