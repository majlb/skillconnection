package com.skillconnect.service;

import com.skillconnect.config.AppProperties;
import com.skillconnect.domain.ServiceOffering;
import com.skillconnect.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PricingServiceTest {

    private final PricingService pricing = new PricingService(new AppProperties(null, null, null,
            new AppProperties.Payments(BigDecimal.valueOf(15), BigDecimal.valueOf(20)), null, null));

    private ServiceOffering offering(ServiceOffering.PricingType type, String price) {
        return ServiceOffering.builder().pricingType(type).price(new BigDecimal(price))
                .durationOptions("30,60,90").maxStudents(5).packageSessions(10).build();
    }

    @Test
    void hourlyScalesWithDuration() {
        var q = pricing.quote(offering(ServiceOffering.PricingType.HOURLY, "20.00"), 90, 1);
        assertThat(q.total()).isEqualByComparingTo("30.00");
        assertThat(q.deposit()).isEqualByComparingTo("6.00");
    }

    @Test
    void groupMultipliesByParticipants() {
        var q = pricing.quote(offering(ServiceOffering.PricingType.GROUP, "10.00"), 60, 4);
        assertThat(q.total()).isEqualByComparingTo("40.00");
    }

    @Test
    void packageIsFlat() {
        var q = pricing.quote(offering(ServiceOffering.PricingType.PACKAGE, "180.00"), 60, 1);
        assertThat(q.total()).isEqualByComparingTo("180.00");
    }

    @Test
    void rejectsUnofferedDuration() {
        assertThatThrownBy(() -> pricing.quote(offering(ServiceOffering.PricingType.HOURLY, "20"), 45, 1))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void haversineIsReasonable() {
        // Paris → London ≈ 344 km
        assertThat(SearchService.haversineKm(48.8566, 2.3522, 51.5074, -0.1278)).isBetween(340.0, 348.0);
    }
}
