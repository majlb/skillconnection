package com.skillconnect.web;

import com.skillconnect.dto.Dtos.*;
import com.skillconnect.service.CatalogService;
import com.skillconnect.service.InstructorService;
import com.skillconnect.service.BookingService;
import com.skillconnect.service.ReviewService;
import com.skillconnect.service.SearchService;
import com.skillconnect.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

/** Unauthenticated read endpoints: catalog, search, public instructor profiles. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PublicController {

    private final CatalogService catalog;
    private final SearchService search;
    private final InstructorService instructors;
    private final ReviewService reviews;
    private final BookingService bookings;
    private final StorageService storage;

    @GetMapping("/catalog/categories")
    public List<CategoryDto> categories() {
        return catalog.activeCategories();
    }

    @GetMapping("/catalog/subjects")
    public List<SubjectDto> subjects(@RequestParam(required = false) Long categoryId) {
        return catalog.subjects(categoryId);
    }

    @GetMapping("/catalog/age-groups")
    public List<AgeGroupDto> ageGroups() {
        return catalog.ageGroups();
    }

    @GetMapping("/search")
    public PageResponse<InstructorSummaryDto> search(@ModelAttribute SearchQuery query) {
        return search.search(query);
    }

    @GetMapping("/instructors/{id}")
    public InstructorDetailDto instructor(@PathVariable Long id) {
        return instructors.publicProfile(id);
    }

    @GetMapping("/instructors/{id}/services")
    public List<ServiceDto> instructorServices(@PathVariable Long id) {
        return instructors.publicServices(id);
    }

    @GetMapping("/instructors/{id}/locations")
    public List<LocationDto> instructorLocations(@PathVariable Long id) {
        return instructors.publicLocations(id);
    }

    @GetMapping("/instructors/{id}/reviews")
    public PageResponse<ReviewDto> instructorReviews(@PathVariable Long id,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "10") int size) {
        return reviews.forInstructor(id, page, size);
    }

    @GetMapping("/instructors/{id}/availability")
    public List<TimeSlotDto> availability(@PathVariable Long id,
                                          @RequestParam(required = false) Long serviceId,
                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                          @RequestParam(required = false) Integer duration) {
        return bookings.openSlots(id, serviceId, from, to, duration);
    }

    @GetMapping("/files/avatars/{name}")
    public ResponseEntity<Resource> avatar(@PathVariable String name) throws java.io.IOException {
        Path file = storage.resolve(StorageService.Bucket.AVATARS, name);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .header("Content-Type", Files.probeContentType(file))
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(file));
    }
}
