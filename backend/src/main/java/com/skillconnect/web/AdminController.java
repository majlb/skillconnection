package com.skillconnect.web;

import com.skillconnect.domain.Dispute;
import com.skillconnect.domain.Instructor;
import com.skillconnect.domain.Payment;
import com.skillconnect.domain.Review;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.service.AdminService;
import com.skillconnect.service.CatalogService;
import com.skillconnect.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Back-office. Secured by ROLE_ADMIN in SecurityConfig. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService admin;
    private final CatalogService catalog;
    private final ReviewService reviews;

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return admin.stats();
    }

    @GetMapping("/reports")
    public Map<String, List<ReportRowDto>> reports() {
        return admin.reports();
    }

    // ----- Instructors -----
    @GetMapping("/instructors")
    public PageResponse<InstructorSummaryDto> instructors(@RequestParam(defaultValue = "PENDING") Instructor.VerificationStatus status,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "20") int size) {
        return admin.instructorsByStatus(status, page, size);
    }

    @GetMapping("/instructors/{id}/documents")
    public List<DocumentDto> documents(@PathVariable Long id) {
        return admin.instructorDocuments(id);
    }

    @GetMapping("/documents/{id}/file")
    public ResponseEntity<Resource> documentFile(@PathVariable Long id) {
        var path = admin.documentFile(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + path.getFileName())
                .body(new FileSystemResource(path));
    }

    @PostMapping("/instructors/{id}/verification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(@PathVariable Long id, @RequestParam Instructor.VerificationStatus status) {
        admin.setVerification(id, status);
    }

    @PostMapping("/users/{id}/enabled")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void enable(@PathVariable Long id, @RequestParam boolean enabled) {
        admin.setUserEnabled(id, enabled);
    }

    // ----- Catalog -----
    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalog.allCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@Valid @RequestBody CategoryRequest req) {
        return catalog.saveCategory(null, req);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest req) {
        return catalog.saveCategory(id, req);
    }

    @PostMapping("/age-groups")
    @ResponseStatus(HttpStatus.CREATED)
    public AgeGroupDto createAgeGroup(@Valid @RequestBody AgeGroupRequest req) {
        return catalog.saveAgeGroup(null, req);
    }

    @PutMapping("/age-groups/{id}")
    public AgeGroupDto updateAgeGroup(@PathVariable Long id, @Valid @RequestBody AgeGroupRequest req) {
        return catalog.saveAgeGroup(id, req);
    }

    @DeleteMapping("/age-groups/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAgeGroup(@PathVariable Long id) {
        catalog.deleteAgeGroup(id);
    }

    // ----- Reviews -----
    @GetMapping("/reviews")
    public List<ReviewDto> reviews(@RequestParam(defaultValue = "FLAGGED") Review.Status status) {
        return reviews.byStatus(status);
    }

    @PostMapping("/reviews/{id}/status")
    public ReviewDto moderate(@PathVariable Long id, @RequestParam Review.Status status) {
        return reviews.moderate(id, status);
    }

    // ----- Disputes -----
    @GetMapping("/disputes")
    public List<DisputeDto> disputes(@RequestParam(defaultValue = "OPEN") Dispute.Status status) {
        return admin.disputes(status);
    }

    @PostMapping("/disputes/{id}/resolve")
    public DisputeDto resolve(@PathVariable Long id, @Valid @RequestBody ResolveDisputeRequest req) {
        return admin.resolve(id, req);
    }

    // ----- Payments -----
    @GetMapping("/payments")
    public List<PaymentDto> payments(@RequestParam(defaultValue = "PENDING") Payment.Status status) {
        return admin.recentPayments(status);
    }

    @PostMapping("/payments/{id}/settle")
    public PaymentDto settle(@PathVariable Long id) {
        return admin.markPayoutPaid(id);
    }
}
