package com.skillconnect.dto;

import com.skillconnect.domain.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** API request/response contracts. */
public final class Dtos {

    private Dtos() {}

    // ---------- Auth & users ----------
    public record RegisterRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8, max = 100)
            @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "must contain letters and digits") String password,
            @NotBlank @Size(max = 150) String fullName,
            @NotNull @Pattern(regexp = "CUSTOMER|INSTRUCTOR") String role,
            @Size(max = 30) String phone) {}

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record AuthResponse(String accessToken, String refreshToken, long expiresIn, UserDto user) {}

    public record UserDto(Long id, String email, String fullName, Integer age, String gender, String phone,
                          String avatarUrl, String preferredLanguage, Set<String> roles, Long instructorId) {}

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 150) String fullName,
            @Min(3) @Max(120) Integer age,
            @Size(max = 20) String gender,
            @Size(max = 30) String phone,
            @Size(max = 10) String preferredLanguage) {}

    // ---------- Catalog ----------
    public record CategoryDto(Long id, String name, String slug, String icon, boolean active) {}

    public record CategoryRequest(@NotBlank String name, @NotBlank @Pattern(regexp = "[a-z0-9-]+") String slug,
                                  String icon, boolean active) {}

    public record SubjectDto(Long id, Long categoryId, String name, String slug) {}

    public record AgeGroupDto(Long id, String code, String label, int minAge, Integer maxAge, int sortOrder) {}

    public record AgeGroupRequest(@NotBlank String code, @NotBlank String label, @Min(0) int minAge,
                                  Integer maxAge, int sortOrder) {}

    // ---------- Locations ----------
    public record LocationDto(Long id, String label, String address, String city, String country,
                              double latitude, double longitude, boolean primary) {}

    public record LocationRequest(@Size(max = 100) String label, @Size(max = 300) String address,
                                  @NotBlank String city, String country,
                                  @DecimalMin("-90") @DecimalMax("90") double latitude,
                                  @DecimalMin("-180") @DecimalMax("180") double longitude,
                                  boolean primary) {}

    // ---------- Services / offerings ----------
    public record ServiceDto(Long id, Long instructorId, Long categoryId, String categoryName, Long subjectId,
                             String subjectName, Long ageGroupId, String ageGroupLabel, String name, String description,
                             ServiceOffering.DeliveryMode deliveryMode, ServiceOffering.PricingType pricingType,
                             BigDecimal price, Integer packageSessions, BigDecimal groupPricePerStudent,
                             List<Integer> durationOptions, int maxStudents, String currency, boolean active) {}

    public record ServiceRequest(
            @NotNull Long categoryId, Long subjectId, Long ageGroupId,
            @NotBlank @Size(max = 150) String name, @Size(max = 5000) String description,
            @NotNull ServiceOffering.DeliveryMode deliveryMode, @NotNull ServiceOffering.PricingType pricingType,
            @NotNull @DecimalMin("0") BigDecimal price, @Min(1) Integer packageSessions,
            @DecimalMin("0") BigDecimal groupPricePerStudent,
            @NotEmpty List<@Min(15) @Max(480) Integer> durationOptions,
            @Min(1) @Max(100) int maxStudents, boolean active) {}

    // ---------- Instructors ----------
    public record InstructorSummaryDto(Long id, Long userId, String fullName, String avatarUrl, String headline,
                                       BigDecimal ratingAvg, int ratingCount, BigDecimal minPrice,
                                       List<String> categories, Set<String> deliveryModes,
                                       List<LocationDto> locations, Double distanceKm, boolean verified) {}

    public record InstructorDetailDto(InstructorSummaryDto summary, String bio, Integer experienceYears,
                                      String experience, String education, List<String> languages,
                                      String teachingMethods, String serviceDescription, int serviceRadiusKm,
                                      String timeZone, List<ServiceDto> services) {}

    public record InstructorProfileRequest(
            @Size(max = 200) String headline, @Size(max = 5000) String bio, @Min(0) @Max(80) Integer experienceYears,
            @Size(max = 5000) String experience, @Size(max = 5000) String education, List<String> languages,
            @Size(max = 5000) String teachingMethods, @Size(max = 5000) String serviceDescription,
            @Min(1) @Max(200) Integer serviceRadiusKm, @Size(max = 50) String timeZone) {}

    public record DocumentDto(Long id, Document.Type docType, String fileName, Document.Status status, Instant createdAt) {}

    // ---------- Search ----------
    public record SearchQuery(String q, Long categoryId, Long subjectId, Long ageGroupId, String city,
                              ServiceOffering.DeliveryMode mode, BigDecimal minPrice, BigDecimal maxPrice,
                              Double minRating, Double lat, Double lng, Double radiusKm,
                              String sort, Integer page, Integer size) {
        public int pageOrDefault() { return page == null || page < 0 ? 0 : page; }
        public int sizeOrDefault() { return size == null ? 20 : Math.min(Math.max(size, 1), 100); }
    }

    public record PageResponse<T>(List<T> content, int page, int size, long totalElements) {}

    // ---------- Availability ----------
    public record AvailabilityRequest(@NotNull AvailabilitySlot.SlotType slotType, @Min(1) @Max(7) Integer dayOfWeek,
                                      LocalTime startTime, LocalTime endTime, LocalDate startDate, LocalDate endDate,
                                      Long locationId, @Size(max = 200) String note) {}

    public record AvailabilitySlotDto(Long id, AvailabilitySlot.SlotType slotType, Integer dayOfWeek,
                                      LocalTime startTime, LocalTime endTime, LocalDate startDate, LocalDate endDate,
                                      Long locationId, String note) {}

    public record TimeSlotDto(Instant start, Instant end) {}

    // ---------- Booking ----------
    public record QuoteRequest(@NotNull Long serviceId, @NotNull @Min(15) Integer durationMinutes,
                               @Min(1) Integer participants) {}

    public record QuoteDto(BigDecimal unitPrice, String pricingType, int durationMinutes, int participants,
                           BigDecimal total, BigDecimal deposit, String currency, String breakdown) {}

    public record CreateBookingRequest(
            @NotNull Long serviceId, @NotNull @Future Instant startAt, @NotNull @Min(15) Integer durationMinutes,
            @Min(1) Integer participants, @NotNull ServiceOffering.DeliveryMode deliveryMode, Long locationId,
            @Size(max = 2000) String notes, @NotNull Payment.Method paymentMethod,
            @Size(max = 500) String paymentToken, boolean payDepositOnly) {}

    public record BookingDto(Long id, Long serviceId, String serviceName, Long instructorId, Long instructorUserId,
                             String instructorName, Long customerId, String customerName, Instant startAt, Instant endAt,
                             int durationMinutes, int participants, ServiceOffering.DeliveryMode deliveryMode,
                             Booking.Status status, BigDecimal totalPrice, BigDecimal depositAmount, String currency,
                             String meetingUrl, LocationDto location, Boolean attended, String notes,
                             String cancellationReason) {}

    public record RescheduleRequest(@NotNull @Future Instant startAt) {}

    public record ReasonRequest(@Size(max = 500) String reason) {}

    public record AttendanceRequest(boolean attended) {}

    // ---------- Payments ----------
    public record PaymentDto(Long id, Long bookingId, BigDecimal amount, String currency, Payment.Method method,
                             Payment.Type type, Payment.Status status, Instant createdAt) {}

    // ---------- Reviews ----------
    public record ReviewRequest(@NotNull Long bookingId, @Min(1) @Max(5) int rating, @Size(max = 3000) String comment) {}

    public record ReviewReplyRequest(@NotBlank @Size(max = 3000) String response) {}

    public record ReviewDto(Long id, Long bookingId, Long instructorId, String customerName, String customerAvatar,
                            int rating, String comment, String instructorResponse, Instant responseAt,
                            Review.Status status, Instant createdAt) {}

    // ---------- Messaging & notifications ----------
    public record SendMessageRequest(@NotNull Long recipientId, @NotBlank @Size(max = 4000) String content) {}

    public record MessageDto(Long id, Long senderId, Long recipientId, String content, Instant createdAt, Instant readAt) {}

    public record ConversationDto(Long partnerId, String partnerName, String partnerAvatar, String lastMessage,
                                  Instant lastAt, boolean unread) {}

    public record NotificationDto(Long id, Notification.Type type, String title, String body, String link,
                                  boolean read, Instant createdAt) {}

    // ---------- Reports ----------
    public record ReportRowDto(String label, long value, BigDecimal amount) {}

    public record EarningsDto(BigDecimal grossRevenue, BigDecimal netRevenue, long completedSessions,
                              long upcomingSessions, List<ReportRowDto> monthly, List<ReportRowDto> statusBreakdown,
                              List<PaymentDto> payouts) {}

    public record AdminStatsDto(long totalUsers, long totalInstructors, long pendingInstructors,
                                long totalBookings, BigDecimal totalRevenue) {}

    public record DisputeRequest(@NotNull Long bookingId, @NotBlank @Size(max = 3000) String reason) {}

    public record ResolveDisputeRequest(@NotNull Dispute.Status status, @Size(max = 3000) String resolution) {}

    public record DisputeDto(Long id, Long bookingId, String raisedBy, String reason, Dispute.Status status,
                             String resolution, Instant createdAt) {}

    // ---------- AI ----------
    public record AssistantRequest(@NotBlank @Size(max = 1000) String message) {}

    public record AssistantResponse(String reply, Map<String, Object> filters, List<InstructorSummaryDto> results) {}

    public record PriceSuggestionDto(BigDecimal min, BigDecimal median, BigDecimal max, BigDecimal suggested,
                                     int sampleSize) {}
}
