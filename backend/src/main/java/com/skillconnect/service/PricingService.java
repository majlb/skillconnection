package com.skillconnect.service;

import com.skillconnect.config.AppProperties;
import com.skillconnect.domain.ServiceOffering;
import com.skillconnect.dto.Dtos.QuoteDto;
import com.skillconnect.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class PricingService {

    private static final BigDecimal SIXTY = BigDecimal.valueOf(60);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final AppProperties props;

    public QuoteDto quote(ServiceOffering s, int durationMinutes, int participants) {
        if (!s.durationList().contains(durationMinutes)) {
            throw ApiException.badRequest("Duration not offered for this service: " + durationMinutes);
        }
        if (participants < 1 || participants > s.getMaxStudents()) {
            throw ApiException.badRequest("Participants must be between 1 and " + s.getMaxStudents());
        }
        BigDecimal hours = BigDecimal.valueOf(durationMinutes).divide(SIXTY, 4, RoundingMode.HALF_UP);
        BigDecimal unit;
        BigDecimal total;
        String breakdown;
        switch (s.getPricingType()) {
            case HOURLY -> {
                unit = s.getPrice();
                total = unit.multiply(hours);
                breakdown = "%s/h × %s h".formatted(unit, hours.stripTrailingZeros().toPlainString());
            }
            case PACKAGE -> {
                unit = s.getPrice();
                total = unit;
                breakdown = "Package of %d sessions × %d min".formatted(s.getPackageSessions(), durationMinutes);
            }
            case GROUP -> {
                unit = s.getGroupPricePerStudent() != null ? s.getGroupPricePerStudent() : s.getPrice();
                total = unit.multiply(hours).multiply(BigDecimal.valueOf(participants));
                breakdown = "%s/h per student × %s h × %d students".formatted(unit, hours.stripTrailingZeros().toPlainString(), participants);
            }
            default -> throw new IllegalStateException();
        }
        total = total.setScale(2, RoundingMode.HALF_UP);
        BigDecimal deposit = total.multiply(props.payments().defaultDepositPercent())
                .divide(HUNDRED, 2, RoundingMode.HALF_UP);
        return new QuoteDto(unit, s.getPricingType().name(), durationMinutes, participants, total, deposit,
                s.getCurrency(), breakdown);
    }

    public BigDecimal platformFee(BigDecimal amount) {
        return amount.multiply(props.payments().platformFeePercent()).divide(HUNDRED, 2, RoundingMode.HALF_UP);
    }
}
