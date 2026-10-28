package com.skillconnect.web;

import com.skillconnect.dto.Dtos.*;
import com.skillconnect.security.AuthUser;
import com.skillconnect.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Endpoints for any authenticated user (customer features, chat, notifications, AI). */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final BookingService bookings;
    private final PaymentService payments;
    private final AccountService account;
    private final ReviewService reviews;
    private final ChatService chat;
    private final NotificationService notifications;
    private final AdminService disputes;
    private final AiService ai;

    // ----- Bookings -----
    @PostMapping("/bookings/quote")
    public QuoteDto quote(@Valid @RequestBody QuoteRequest req) {
        return bookings.quote(req);
    }

    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDto book(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody CreateBookingRequest req) {
        return bookings.create(me.id(), req);
    }

    @GetMapping("/bookings")
    public List<BookingDto> myBookings(@AuthenticationPrincipal AuthUser me, @RequestParam(defaultValue = "upcoming") String bucket) {
        return bookings.customerBookings(me.id(), bucket);
    }

    @GetMapping("/bookings/{id}")
    public BookingDto booking(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return bookings.get(me.id(), id, me.isAdmin());
    }

    @PostMapping("/bookings/{id}/cancel")
    public BookingDto cancel(@AuthenticationPrincipal AuthUser me, @PathVariable Long id, @Valid @RequestBody ReasonRequest req) {
        return bookings.cancel(me.id(), id, req.reason());
    }

    @PostMapping("/bookings/{id}/reschedule")
    public BookingDto reschedule(@AuthenticationPrincipal AuthUser me, @PathVariable Long id, @Valid @RequestBody RescheduleRequest req) {
        return bookings.reschedule(me.id(), id, req.startAt());
    }

    @GetMapping(value = "/bookings/{id}/calendar.ics", produces = "text/calendar")
    public ResponseEntity<String> ics(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=booking-" + id + ".ics")
                .body(bookings.ics(me.id(), id));
    }

    // ----- Account -----
    @PutMapping("/me/profile")
    public UserDto updateProfile(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody UpdateProfileRequest req) {
        return account.updateProfile(me.id(), req);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserDto avatar(@AuthenticationPrincipal AuthUser me, @RequestParam MultipartFile file) {
        return account.uploadAvatar(me.id(), file);
    }

    @GetMapping("/me/payments")
    public List<PaymentDto> payments(@AuthenticationPrincipal AuthUser me) {
        return payments.history(me.id());
    }

    @GetMapping("/me/favorites")
    public List<InstructorSummaryDto> favorites(@AuthenticationPrincipal AuthUser me) {
        return account.favorites(me.id());
    }

    @PutMapping("/me/favorites/{instructorId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addFavorite(@AuthenticationPrincipal AuthUser me, @PathVariable Long instructorId) {
        account.addFavorite(me.id(), instructorId);
    }

    @DeleteMapping("/me/favorites/{instructorId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeFavorite(@AuthenticationPrincipal AuthUser me, @PathVariable Long instructorId) {
        account.removeFavorite(me.id(), instructorId);
    }

    @PostMapping("/disputes")
    @ResponseStatus(HttpStatus.CREATED)
    public DisputeDto dispute(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody DisputeRequest req) {
        return disputes.openDispute(me.id(), req);
    }

    // ----- Reviews -----
    @PostMapping("/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewDto review(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ReviewRequest req) {
        return reviews.create(me.id(), req);
    }

    @PostMapping("/reviews/{id}/flag")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void flag(@PathVariable Long id) {
        reviews.flag(id);
    }

    // ----- Messages -----
    @GetMapping("/messages/conversations")
    public List<ConversationDto> conversations(@AuthenticationPrincipal AuthUser me) {
        return chat.conversations(me.id());
    }

    @GetMapping("/messages/{partnerId}")
    public List<MessageDto> conversation(@AuthenticationPrincipal AuthUser me, @PathVariable Long partnerId) {
        return chat.conversation(me.id(), partnerId);
    }

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageDto send(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody SendMessageRequest req) {
        return chat.send(me.id(), req);
    }

    // ----- Notifications -----
    @GetMapping("/notifications")
    public PageResponse<NotificationDto> notifications(@AuthenticationPrincipal AuthUser me,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "20") int size) {
        return notifications.list(me.id(), page, size);
    }

    @GetMapping("/notifications/unread-count")
    public long unread(@AuthenticationPrincipal AuthUser me) {
        return notifications.unreadCount(me.id());
    }

    @PostMapping("/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        notifications.markRead(me.id(), id);
    }

    @PostMapping("/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void readAll(@AuthenticationPrincipal AuthUser me) {
        notifications.markAllRead(me.id());
    }

    // ----- AI -----
    @GetMapping("/ai/recommendations")
    public List<InstructorSummaryDto> recommendations(@AuthenticationPrincipal AuthUser me) {
        return ai.recommendations(me.id());
    }

    @GetMapping("/ai/price-suggestion")
    public PriceSuggestionDto priceSuggestion(@RequestParam Long categoryId, @RequestParam(required = false) Long ageGroupId) {
        return ai.priceSuggestion(categoryId, ageGroupId);
    }

    @PostMapping("/ai/assistant")
    public AssistantResponse assistant(@Valid @RequestBody AssistantRequest req) {
        return ai.assistant(req.message());
    }
}
