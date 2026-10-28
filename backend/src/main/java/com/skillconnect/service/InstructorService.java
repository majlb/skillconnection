package com.skillconnect.service;

import com.skillconnect.domain.*;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.dto.Mapper;
import com.skillconnect.exception.ApiException;
import com.skillconnect.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorService {

    private final InstructorRepository instructors;
    private final InstructorProfileRepository profiles;
    private final ServiceOfferingRepository services;
    private final InstructorLocationRepository instructorLocations;
    private final AvailabilitySlotRepository slots;
    private final DocumentRepository documents;
    private final CategoryRepository categories;
    private final SubjectRepository subjects;
    private final AgeGroupRepository ageGroups;
    private final LocationRepository locations;
    private final StorageService storage;

    // ---------------- Lookup helpers ----------------

    public Instructor requireByUser(Long userId) {
        return instructors.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Instructor profile"));
    }

    public Instructor requirePublic(Long instructorId) {
        Instructor i = instructors.findById(instructorId).orElseThrow(() -> ApiException.notFound("Instructor"));
        if (i.getVerificationStatus() != Instructor.VerificationStatus.APPROVED) {
            throw ApiException.notFound("Instructor");
        }
        return i;
    }

    /** Batch-builds summary cards for a list of instructors (2 queries regardless of list size). */
    public List<InstructorSummaryDto> summarize(List<Instructor> list, Map<Long, Double> distances) {
        if (list.isEmpty()) return List.of();
        Set<Long> ids = list.stream().map(Instructor::getId).collect(Collectors.toSet());
        Map<Long, List<ServiceOffering>> svc = services.findByInstructorIdInAndActiveTrue(ids).stream()
                .collect(Collectors.groupingBy(s -> s.getInstructor().getId()));
        Map<Long, List<InstructorLocation>> locs = instructorLocations.findByInstructorIdIn(ids).stream()
                .collect(Collectors.groupingBy(l -> l.getInstructor().getId()));
        return list.stream().map(i -> Mapper.instructorSummary(i, svc.getOrDefault(i.getId(), List.of()),
                locs.getOrDefault(i.getId(), List.of()), distances.get(i.getId()))).toList();
    }

    // ---------------- Public profile ----------------

    public InstructorDetailDto publicProfile(Long instructorId) {
        return detail(requirePublic(instructorId));
    }

    public InstructorDetailDto myProfile(Long userId) {
        return detail(requireByUser(userId));
    }

    private InstructorDetailDto detail(Instructor i) {
        InstructorSummaryDto summary = summarize(List.of(i), Map.of()).get(0);
        InstructorProfile p = profiles.findByInstructorId(i.getId()).orElseGet(InstructorProfile::new);
        List<String> langs = p.getLanguages() == null || p.getLanguages().isBlank() ? List.of()
                : Arrays.stream(p.getLanguages().split(",")).map(String::trim).toList();
        List<ServiceDto> svc = services.findByInstructorIdAndActiveTrue(i.getId()).stream().map(Mapper::service).toList();
        return new InstructorDetailDto(summary, p.getBio(), p.getExperienceYears(), p.getExperience(),
                p.getEducation(), langs, p.getTeachingMethods(), p.getServiceDescription(), i.getServiceRadiusKm(),
                i.getTimeZone(), svc);
    }

    @Transactional
    public InstructorDetailDto updateProfile(Long userId, InstructorProfileRequest req) {
        Instructor i = requireByUser(userId);
        i.setHeadline(req.headline());
        if (req.serviceRadiusKm() != null) i.setServiceRadiusKm(req.serviceRadiusKm());
        if (req.timeZone() != null) {
            try {
                i.setTimeZone(java.time.ZoneId.of(req.timeZone()).getId());
            } catch (java.time.DateTimeException e) {
                throw ApiException.badRequest("Invalid time zone");
            }
        }
        InstructorProfile p = profiles.findByInstructorId(i.getId())
                .orElseGet(() -> InstructorProfile.builder().instructor(i).build());
        p.setBio(req.bio());
        p.setExperienceYears(req.experienceYears());
        p.setExperience(req.experience());
        p.setEducation(req.education());
        p.setLanguages(req.languages() == null ? null : String.join(",", req.languages()));
        p.setTeachingMethods(req.teachingMethods());
        p.setServiceDescription(req.serviceDescription());
        profiles.save(p);
        return detail(i);
    }

    // ---------------- Services / offerings ----------------

    public List<ServiceDto> publicServices(Long instructorId) {
        requirePublic(instructorId);
        return services.findByInstructorIdAndActiveTrue(instructorId).stream().map(Mapper::service).toList();
    }

    public List<ServiceDto> myServices(Long userId) {
        return services.findByInstructorId(requireByUser(userId).getId()).stream().map(Mapper::service).toList();
    }

    @Transactional
    public ServiceDto saveService(Long userId, Long serviceId, ServiceRequest req) {
        Instructor i = requireByUser(userId);
        ServiceOffering s = serviceId == null ? ServiceOffering.builder().instructor(i).build() : ownedService(i, serviceId);
        if (req.pricingType() == ServiceOffering.PricingType.PACKAGE && req.packageSessions() == null) {
            throw ApiException.badRequest("packageSessions is required for package pricing");
        }
        s.setCategory(categories.findById(req.categoryId()).orElseThrow(() -> ApiException.notFound("Category")));
        s.setSubject(req.subjectId() == null ? null : subjects.findById(req.subjectId()).orElseThrow(() -> ApiException.notFound("Subject")));
        s.setAgeGroup(req.ageGroupId() == null ? null : ageGroups.findById(req.ageGroupId()).orElseThrow(() -> ApiException.notFound("Age group")));
        s.setName(req.name());
        s.setDescription(req.description());
        s.setDeliveryMode(req.deliveryMode());
        s.setPricingType(req.pricingType());
        s.setPrice(req.price());
        s.setPackageSessions(req.packageSessions());
        s.setGroupPricePerStudent(req.groupPricePerStudent());
        s.setDurationOptions(req.durationOptions().stream().distinct().sorted().map(String::valueOf).collect(Collectors.joining(",")));
        s.setMaxStudents(req.pricingType() == ServiceOffering.PricingType.GROUP ? req.maxStudents() : Math.max(1, req.maxStudents()));
        s.setActive(req.active());
        return Mapper.service(services.save(s));
    }

    @Transactional
    public void deactivateService(Long userId, Long serviceId) {
        ownedService(requireByUser(userId), serviceId).setActive(false);
    }

    private ServiceOffering ownedService(Instructor i, Long serviceId) {
        ServiceOffering s = services.findById(serviceId).orElseThrow(() -> ApiException.notFound("Service"));
        if (!s.getInstructor().getId().equals(i.getId())) throw ApiException.forbidden();
        return s;
    }

    // ---------------- Locations ----------------

    public List<LocationDto> locationsOf(Long instructorId) {
        return instructorLocations.findByInstructorId(instructorId).stream()
                .map(l -> Mapper.location(l.getLocation(), l.isPrimary())).toList();
    }

    public List<LocationDto> publicLocations(Long instructorId) {
        requirePublic(instructorId);
        return locationsOf(instructorId);
    }

    @Transactional
    public LocationDto addLocation(Long userId, LocationRequest req) {
        Instructor i = requireByUser(userId);
        List<InstructorLocation> existing = instructorLocations.findByInstructorId(i.getId());
        boolean primary = req.primary() || existing.isEmpty();
        if (primary) existing.forEach(l -> l.setPrimary(false));
        Location loc = locations.save(Location.builder().label(req.label()).address(req.address()).city(req.city())
                .country(req.country()).latitude(req.latitude()).longitude(req.longitude()).build());
        instructorLocations.save(InstructorLocation.builder().instructor(i).location(loc).primary(primary).build());
        return Mapper.location(loc, primary);
    }

    @Transactional
    public void removeLocation(Long userId, Long locationId) {
        Instructor i = requireByUser(userId);
        instructorLocations.findByInstructorId(i.getId()).stream()
                .filter(l -> l.getLocation().getId().equals(locationId))
                .findFirst()
                .ifPresentOrElse(instructorLocations::delete, () -> { throw ApiException.notFound("Location"); });
    }

    // ---------------- Availability ----------------

    public List<AvailabilitySlotDto> availabilityOf(Long instructorId) {
        return slots.findByInstructorId(instructorId).stream().map(Mapper::slot).toList();
    }

    @Transactional
    public AvailabilitySlotDto addAvailability(Long userId, AvailabilityRequest req) {
        Instructor i = requireByUser(userId);
        validateSlot(req);
        AvailabilitySlot slot = AvailabilitySlot.builder().instructor(i).slotType(req.slotType())
                .dayOfWeek(req.dayOfWeek()).startTime(req.startTime()).endTime(req.endTime())
                .startDate(req.startDate()).endDate(req.endDate()).note(req.note())
                .location(req.locationId() == null ? null : locations.findById(req.locationId()).orElse(null))
                .build();
        return Mapper.slot(slots.save(slot));
    }

    @Transactional
    public void removeAvailability(Long userId, Long slotId) {
        Instructor i = requireByUser(userId);
        AvailabilitySlot s = slots.findById(slotId).orElseThrow(() -> ApiException.notFound("Slot"));
        if (!s.getInstructor().getId().equals(i.getId())) throw ApiException.forbidden();
        slots.delete(s);
    }

    private void validateSlot(AvailabilityRequest r) {
        boolean timesOk = r.startTime() != null && r.endTime() != null && r.endTime().isAfter(r.startTime());
        switch (r.slotType()) {
            case RECURRING -> {
                if (r.dayOfWeek() == null || !timesOk) throw ApiException.badRequest("Recurring slots need dayOfWeek and a valid time range");
            }
            case ONE_OFF -> {
                if (r.startDate() == null || !timesOk) throw ApiException.badRequest("One-off slots need startDate and a valid time range");
            }
            case BLOCKED -> {
                if (r.startDate() == null) throw ApiException.badRequest("Blocked periods need startDate");
                if (r.endDate() != null && r.endDate().isBefore(r.startDate())) throw ApiException.badRequest("endDate before startDate");
            }
        }
    }

    // ---------------- Documents ----------------

    public List<DocumentDto> myDocuments(Long userId) {
        return documents.findByInstructorId(requireByUser(userId).getId()).stream().map(Mapper::document).toList();
    }

    @Transactional
    public DocumentDto uploadDocument(Long userId, Document.Type type, MultipartFile file) {
        Instructor i = requireByUser(userId);
        String stored = storage.store(StorageService.Bucket.DOCUMENTS, file);
        String original = Optional.ofNullable(file.getOriginalFilename()).orElse("document")
                .replaceAll("[^A-Za-z0-9._-]", "_");
        Document d = Document.builder().instructor(i).docType(type).fileName(original).fileUrl(stored).build();
        return Mapper.document(documents.save(d));
    }
}
