package com.skillconnect.service;

import com.skillconnect.domain.Payment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Payment provider abstraction. Production adapters:
 *  - Stripe PaymentIntents for CARD / APPLE_PAY / GOOGLE_PAY (wallets via Payment Request Button)
 *  - PayPal Orders v2 for PAYPAL
 * Card data never touches our servers: the SPA tokenises with the provider SDK and sends only a token.
 */
public interface PaymentGateway {

    record ChargeResult(boolean success, String providerRef, String failureReason) {}

    ChargeResult charge(BigDecimal amount, String currency, Payment.Method method, String paymentToken, String idempotencyKey);

    ChargeResult refund(String providerRef, BigDecimal amount);

    /** Development gateway: approves every charge. Replace with real adapters via a @Primary bean. */
    @Slf4j
    @Component
    class SandboxPaymentGateway implements PaymentGateway {
        @Override
        public ChargeResult charge(BigDecimal amount, String currency, Payment.Method method, String token, String key) {
            log.info("Sandbox charge {} {} via {}", amount, currency, method);
            return new ChargeResult(true, "sbx_" + UUID.randomUUID(), null);
        }

        @Override
        public ChargeResult refund(String providerRef, BigDecimal amount) {
            log.info("Sandbox refund {} on {}", amount, providerRef);
            return new ChargeResult(true, "sbx_rf_" + UUID.randomUUID(), null);
        }
    }
}
