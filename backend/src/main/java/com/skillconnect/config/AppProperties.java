package com.skillconnect.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String frontendUrl,
        List<String> corsOrigins,
        Jwt jwt,
        Payments payments,
        Notifications notifications,
        Storage storage) {

    public record Jwt(String secret, Duration accessTokenTtl, Duration refreshTokenTtl) {}

    public record Payments(BigDecimal platformFeePercent, BigDecimal defaultDepositPercent) {}

    public record Notifications(boolean emailEnabled, boolean smsEnabled) {}

    public record Storage(String uploadDir) {}
}
