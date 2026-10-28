package com.skillconnect.service;

import com.skillconnect.domain.AvailabilitySlot;
import com.skillconnect.domain.Booking;
import com.skillconnect.domain.Instructor;
import com.skillconnect.dto.Dtos.TimeSlotDto;
import com.skillconnect.repository.Repositories.AvailabilitySlotRepository;
import com.skillconnect.repository.Repositories.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.ArrayList;
import java.util.List;

/** Expands recurring/one-off windows minus blocked periods and existing bookings into bookable start times. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AvailabilityService {

    private static final int STEP_MINUTES = 30;
    private static final Duration MIN_NOTICE = Duration.ofHours(2);
    private static final int MAX_RANGE_DAYS = 62;

    private final AvailabilitySlotRepository slots;
    private final BookingRepository bookings;

    public List<TimeSlotDto> openSlots(Instructor instructor, LocalDate from, LocalDate to, int durationMinutes) {
        if (to.isAfter(from.plusDays(MAX_RANGE_DAYS))) to = from.plusDays(MAX_RANGE_DAYS);
        ZoneId zone = ZoneId.of(instructor.getTimeZone());
        List<AvailabilitySlot> defs = slots.findByInstructorId(instructor.getId());
        List<Booking> busy = bookings.findByInstructorIdAndStartAtBetweenAndStatusIn(instructor.getId(),
                from.atStartOfDay(zone).toInstant().minus(Duration.ofDays(1)),
                to.plusDays(1).atStartOfDay(zone).toInstant(),
                List.of(Booking.Status.PENDING, Booking.Status.CONFIRMED));

        Instant earliest = Instant.now().plus(MIN_NOTICE);
        Duration len = Duration.ofMinutes(durationMinutes);
        List<TimeSlotDto> result = new ArrayList<>();

        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            for (AvailabilitySlot w : windowsFor(defs, day)) {
                ZonedDateTime cursor = day.atTime(w.getStartTime()).atZone(zone);
                ZonedDateTime windowEnd = day.atTime(w.getEndTime()).atZone(zone);
                for (; !cursor.plus(len).isAfter(windowEnd); cursor = cursor.plusMinutes(STEP_MINUTES)) {
                    Instant s = cursor.toInstant();
                    Instant e = s.plus(len);
                    if (s.isBefore(earliest) || isBlocked(defs, zone, s, e) || overlapsAny(busy, s, e)) continue;
                    result.add(new TimeSlotDto(s, e));
                }
            }
        }
        return result;
    }

    /** True if [start, end) lies fully inside an availability window and is not blocked or booked. */
    public boolean isBookable(Instructor instructor, Instant start, Instant end, Long excludeBookingId) {
        ZoneId zone = ZoneId.of(instructor.getTimeZone());
        List<AvailabilitySlot> defs = slots.findByInstructorId(instructor.getId());
        ZonedDateTime zs = start.atZone(zone);
        ZonedDateTime ze = end.atZone(zone);
        if (!zs.toLocalDate().equals(ze.toLocalDate()) && !ze.toLocalTime().equals(LocalTime.MIDNIGHT)) return false;
        boolean inWindow = windowsFor(defs, zs.toLocalDate()).stream().anyMatch(w ->
                !zs.toLocalTime().isBefore(w.getStartTime()) && !ze.toLocalTime().isAfter(w.getEndTime()));
        return inWindow && !isBlocked(defs, zone, start, end)
                && !bookings.hasOverlap(instructor.getId(), start, end, excludeBookingId);
    }

    private List<AvailabilitySlot> windowsFor(List<AvailabilitySlot> defs, LocalDate day) {
        int dow = day.getDayOfWeek().getValue();
        return defs.stream().filter(d ->
                (d.getSlotType() == AvailabilitySlot.SlotType.RECURRING && d.getDayOfWeek() == dow)
                        || (d.getSlotType() == AvailabilitySlot.SlotType.ONE_OFF && day.equals(d.getStartDate())))
                .toList();
    }

    private boolean isBlocked(List<AvailabilitySlot> defs, ZoneId zone, Instant s, Instant e) {
        for (AvailabilitySlot b : defs) {
            if (b.getSlotType() != AvailabilitySlot.SlotType.BLOCKED) continue;
            LocalDate endDate = b.getEndDate() != null ? b.getEndDate() : b.getStartDate();
            LocalTime bs = b.getStartTime() != null ? b.getStartTime() : LocalTime.MIN;
            Instant blockStart = b.getStartDate().atTime(bs).atZone(zone).toInstant();
            Instant blockEnd = b.getEndTime() != null
                    ? endDate.atTime(b.getEndTime()).atZone(zone).toInstant()
                    : endDate.plusDays(1).atStartOfDay(zone).toInstant();
            if (s.isBefore(blockEnd) && e.isAfter(blockStart)) return true;
        }
        return false;
    }

    private boolean overlapsAny(List<Booking> busy, Instant s, Instant e) {
        return busy.stream().anyMatch(b -> s.isBefore(b.getEndAt()) && e.isAfter(b.getStartAt()));
    }
}
