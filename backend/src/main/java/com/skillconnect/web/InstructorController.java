package com.skillconnect.web;

import com.skillconnect.domain.Document;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.security.AuthUser;
import com.skillconnect.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Instructor self-service. Secured by ROLE_INSTRUCTOR in SecurityConfig. */
@RestController
@RequestMapping("/api/instructor")
@RequiredArgsConstructor
public class InstructorController {

    private final InstructorService instructors;
    private final BookingService bookings;
    private final ReviewService reviews;
    private final AdminService reports;
    private final AiService ai;

    // ----- Profile -----
    @GetMapping("/profile")
    public InstructorDetailDto profile(@AuthenticationPrincipal AuthUser me) {
        return instructors.myProfile(me.id());
    }

    @PutMapping("/profile")
    public InstructorDetailDto updateProfile(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody InstructorProfileRequest req) {
        return instructors.updateProfile(me.id(), req);
    }

    // ----- Services -----
    @GetMapping("/services")
    public List<ServiceDto> services(@AuthenticationPrincipal AuthUser me) {
        return instructors.myServices(me.id());
    }

    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceDto createService(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ServiceRequest req) {
        return instructors.saveService(me.id(), null, req);
    }

    @PutMapping("/services/{id}")
    public ServiceDto updateService(@AuthenticationPrincipal AuthUser me, @PathVariable Long id, @Valid @RequestBody ServiceRequest req) {
        return instructors.saveService(me.id(), id, req);
    }

    @DeleteMapping("/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteService(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        instructors.deactivateService(me.id(), id);
    }

    // ----- Locations -----
    @GetMapping("/locations")
    public List<LocationDto> locations(@AuthenticationPrincipal AuthUser me) {
        return instructors.locationsOf(instructors.requireByUser(me.id()).getId());
    }

    @PostMapping("/locations")
    @ResponseStatus(HttpStatus.CREATED)
    public LocationDto addLocation(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody LocationRequest req) {
        return instructors.addLocation(me.id(), req);
    }

    @DeleteMapping("/locations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeLocation(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        instructors.removeLocation(me.id(), id);
    }

    // ----- Availability -----
    @GetMapping("/availability")
    public List<AvailabilitySlotDto> availability(@AuthenticationPrincipal AuthUser me) {
        return instructors.availabilityOf(instructors.requireByUser(me.id()).getId());
    }

    @PostMapping("/availability")
    @ResponseStatus(HttpStatus.CREATED)
    public AvailabilitySlotDto addAvailability(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody AvailabilityRequest req) {
        return instructors.addAvailability(me.id(), req);
    }

    @DeleteMapping("/availability/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeAvailability(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        instructors.removeAvailability(me.id(), id);
    }

    @GetMapping("/availability/insights")
    public List<String> insights(@AuthenticationPrincipal AuthUser me) {
        return ai.availabilityInsights(me.id());
    }

    // ----- Documents -----
    @GetMapping("/documents")
    public List<DocumentDto> documents(@AuthenticationPrincipal AuthUser me) {
        return instructors.myDocuments(me.id());
    }

    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentDto upload(@AuthenticationPrincipal AuthUser me, @RequestParam Document.Type type,
                              @RequestParam MultipartFile file) {
        return instructors.uploadDocument(me.id(), type, file);
    }

    // ----- Bookings -----
    @GetMapping("/bookings")
    public List<BookingDto> bookings(@AuthenticationPrincipal AuthUser me, @RequestParam(defaultValue = "upcoming") String bucket) {
        return bookings.instructorBookings(me.id(), bucket);
    }

    @PostMapping("/bookings/{id}/accept")
    public BookingDto accept(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return bookings.accept(me.id(), id);
    }

    @PostMapping("/bookings/{id}/reject")
    public BookingDto reject(@AuthenticationPrincipal AuthUser me, @PathVariable Long id, @Valid @RequestBody ReasonRequest req) {
        return bookings.reject(me.id(), id, req.reason());
    }

    @PostMapping("/bookings/{id}/attendance")
    public BookingDto attendance(@AuthenticationPrincipal AuthUser me, @PathVariable Long id, @RequestBody AttendanceRequest req) {
        return bookings.markAttendance(me.id(), id, req.attended());
    }

    // ----- Reviews & earnings -----
    @PostMapping("/reviews/{id}/reply")
    public ReviewDto reply(@AuthenticationPrincipal AuthUser me, @PathVariable Long id, @Valid @RequestBody ReviewReplyRequest req) {
        return reviews.reply(me.id(), id, req.response());
    }

    @GetMapping("/earnings")
    public EarningsDto earnings(@AuthenticationPrincipal AuthUser me) {
        return reports.earnings(me.id());
    }
}
