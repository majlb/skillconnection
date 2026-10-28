package com.skillconnect.service;

import com.skillconnect.domain.*;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Heuristic "AI" features that work offline. Each method is a seam for an LLM / ML model
 * (e.g. Azure OpenAI function-calling for the assistant, a learning-to-rank model for recommendations).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiService {

    private static final Pattern PRICE = Pattern.compile("(?:under|below|less than|max)\\s*\\$?(\\d+)");
    private static final Pattern CITY = Pattern.compile("\\b(?:in|near)\\s+([A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+)?)");

    private final SearchService searchService;
    private final CategoryRepository categories;
    private final SubjectRepository subjects;
    private final AgeGroupRepository ageGroups;
    private final ServiceOfferingRepository services;
    private final BookingRepository bookings;
    private final AvailabilitySlotRepository slots;
    private final InstructorService instructorService;

    /** Recommends instructors in categories the customer has booked before, falling back to top-rated. */
    public List<InstructorSummaryDto> recommendations(Long userId) {
        List<Booking> history = bookings.findByCustomerIdAndStatusInOrderByStartAtDesc(userId, List.of(Booking.Status.values()));
        Set<Long> alreadyBooked = new HashSet<>();
        Map<Long, Integer> categoryWeight = new HashMap<>();
        for (Booking b : history) {
            alreadyBooked.add(b.getInstructor().getId());
            categoryWeight.merge(b.getService().getCategory().getId(), 1, Integer::sum);
        }
        Long topCategory = categoryWeight.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
        var result = searchService.search(new SearchQuery(null, topCategory, null, null, null, null, null, null,
                null, null, null, null, "rating", 0, 20)).content();
        return result.stream().filter(i -> !alreadyBooked.contains(i.id())).limit(8).toList();
    }

    /** Suggests an hourly price from the distribution of comparable active offerings. */
    public PriceSuggestionDto priceSuggestion(Long categoryId, Long ageGroupId) {
        List<BigDecimal> prices = services.hourlyPricesFor(categoryId, ageGroupId);
        if (prices.isEmpty()) {
            return new PriceSuggestionDto(null, null, null, BigDecimal.valueOf(25), 0);
        }
        BigDecimal median = prices.get(prices.size() / 2);
        BigDecimal p60 = prices.get(Math.min(prices.size() - 1, (int) Math.floor(prices.size() * 0.6)));
        return new PriceSuggestionDto(prices.get(0), median, prices.get(prices.size() - 1),
                p60.setScale(0, RoundingMode.HALF_UP), prices.size());
    }

    /** Suggests weekly hours with high historical demand that the instructor does not yet offer. */
    public List<String> availabilityInsights(Long instructorUserId) {
        Instructor i = instructorService.requireByUser(instructorUserId);
        ZoneId zone = ZoneId.of(i.getTimeZone());
        Set<Long> categoryIds = new HashSet<>();
        services.findByInstructorIdAndActiveTrue(i.getId()).forEach(s -> categoryIds.add(s.getCategory().getId()));

        Map<String, Integer> demand = new TreeMap<>();
        Instant since = Instant.now().minus(Duration.ofDays(90));
        if (categoryIds.isEmpty()) return List.of();
        bookings.findByCreatedAtAfterAndServiceCategoryIdIn(since, categoryIds)
                .forEach(b -> {
                    ZonedDateTime z = b.getStartAt().atZone(zone);
                    demand.merge(z.getDayOfWeek() + " " + String.format("%02d:00", z.getHour()), 1, Integer::sum);
                });

        List<AvailabilitySlot> defs = slots.findByInstructorId(i.getId());
        return demand.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .filter(e -> !covered(defs, e.getKey()))
                .limit(5)
                .map(e -> "Consider opening " + e.getKey() + " — " + e.getValue() + " bookings in your categories recently")
                .toList();
    }

    /** Natural-language search assistant: extracts filters from the message and runs a search. */
    public AssistantResponse assistant(String message) {
        String lower = message.toLowerCase(Locale.ROOT);
        Map<String, Object> filters = new LinkedHashMap<>();

        Long categoryId = null;
        Long subjectId = null;
        for (Subject s : subjects.findAll()) {
            if (lower.contains(s.getName().toLowerCase(Locale.ROOT))) {
                subjectId = s.getId();
                filters.put("subject", s.getName());
                break;
            }
        }
        if (subjectId == null) {
            for (Category c : categories.findByActiveTrueOrderByName()) {
                String first = c.getName().toLowerCase(Locale.ROOT).split(" ")[0];
                if (lower.contains(first)) {
                    categoryId = c.getId();
                    filters.put("category", c.getName());
                    break;
                }
            }
        }

        Long ageGroupId = null;
        String ageCode = lower.matches(".*\\b(toddler|preschool|kindergarten)\\b.*") ? "AGE_4_6"
                : lower.matches(".*\\b(kid|kids|child|children)\\b.*") ? "AGE_7_10"
                : lower.matches(".*\\b(teen|teenager|high school)\\b.*") ? "AGE_15_18"
                : lower.matches(".*\\b(adult|myself|me)\\b.*") ? "ADULTS" : null;
        if (ageCode != null) {
            for (AgeGroup a : ageGroups.findAll()) {
                if (a.getCode().equals(ageCode)) {
                    ageGroupId = a.getId();
                    filters.put("ageGroup", a.getLabel());
                }
            }
        }

        ServiceOffering.DeliveryMode mode = lower.contains("online") ? ServiceOffering.DeliveryMode.ONLINE
                : (lower.contains("in person") || lower.contains("in-person") || lower.contains("at home"))
                ? ServiceOffering.DeliveryMode.IN_PERSON : null;
        if (mode != null) filters.put("mode", mode);

        BigDecimal maxPrice = null;
        Matcher pm = PRICE.matcher(lower);
        if (pm.find()) {
            maxPrice = new BigDecimal(pm.group(1));
            filters.put("maxPrice", maxPrice);
        }

        String city = null;
        Matcher cm = CITY.matcher(message);
        if (cm.find()) {
            city = cm.group(1);
            filters.put("city", city);
        }

        var results = searchService.search(new SearchQuery(null, categoryId, subjectId, ageGroupId, city, mode,
                null, maxPrice, null, null, null, null, "rating", 0, 5)).content();

        String reply = results.isEmpty()
                ? "I couldn't find a match yet. Try widening the price range or choosing online lessons."
                : "Here are %d top-rated instructors%s.".formatted(results.size(),
                filters.isEmpty() ? "" : " matching " + describe(filters));
        return new AssistantResponse(reply, filters, results);
    }

    private static boolean covered(List<AvailabilitySlot> defs, String key) {
        String[] parts = key.split(" ");
        int dow = DayOfWeek.valueOf(parts[0]).getValue();
        LocalTime t = LocalTime.parse(parts[1]);
        return defs.stream().anyMatch(d -> d.getSlotType() == AvailabilitySlot.SlotType.RECURRING
                && d.getDayOfWeek() == dow && !t.isBefore(d.getStartTime()) && t.isBefore(d.getEndTime()));
    }

    private static String describe(Map<String, Object> f) {
        StringJoiner j = new StringJoiner(", ");
        f.forEach((k, v) -> j.add(k + ": " + v));
        return j.toString();
    }
}
