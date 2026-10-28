package com.skillconnect.service;

import com.skillconnect.domain.Booking;
import com.skillconnect.domain.Payment;
import com.skillconnect.domain.User;
import com.skillconnect.dto.Dtos.PaymentDto;
import com.skillconnect.dto.Mapper;
import com.skillconnect.exception.ApiException;
import com.skillconnect.repository.Repositories.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {

    private final PaymentRepository payments;
    private final PaymentGateway gateway;
    private final PricingService pricing;

    public Payment chargeForBooking(Booking b, Payment.Method method, String paymentToken, boolean depositOnly) {
        boolean deposit = depositOnly && b.getDepositAmount().signum() > 0;
        BigDecimal amount = deposit ? b.getDepositAmount() : b.getTotalPrice();
        return charge(b, b.getCustomer(), amount, method, paymentToken, deposit ? Payment.Type.DEPOSIT : Payment.Type.FULL);
    }

    /** Charges the outstanding balance after a deposit-only booking is completed. */
    public void chargeBalanceIfDue(Booking b) {
        List<Payment> existing = payments.findByBookingId(b.getId());
        BigDecimal paid = paidAmount(existing);
        BigDecimal due = b.getTotalPrice().subtract(paid);
        if (due.signum() > 0) {
            Payment.Method method = existing.isEmpty() ? Payment.Method.CARD : existing.get(0).getMethod();
            charge(b, b.getCustomer(), due, method, null, Payment.Type.BALANCE);
        }
    }

    /** Refunds captured money; when {@code keepDeposit} the deposit is retained (late cancellation policy). */
    public void refund(Booking b, boolean keepDeposit) {
        for (Payment p : payments.findByBookingId(b.getId())) {
            if (p.getStatus() != Payment.Status.SUCCEEDED || p.getType() == Payment.Type.REFUND) continue;
            if (keepDeposit && p.getType() == Payment.Type.DEPOSIT) continue;
            var result = gateway.refund(p.getProviderRef(), p.getAmount());
            if (result.success()) {
                p.setStatus(Payment.Status.REFUNDED);
                payments.save(Payment.builder().booking(b).user(p.getUser()).amount(p.getAmount().negate())
                        .currency(p.getCurrency()).method(p.getMethod()).type(Payment.Type.REFUND)
                        .status(Payment.Status.SUCCEEDED).providerRef(result.providerRef()).build());
            }
        }
    }

    /** Records the instructor payout (net of platform fee) for a completed booking. */
    public void recordPayout(Booking b) {
        BigDecimal net = b.getTotalPrice().subtract(pricing.platformFee(b.getTotalPrice()));
        payments.save(Payment.builder().booking(b).user(b.getInstructor().getUser()).amount(net)
                .currency(b.getCurrency()).method(Payment.Method.BANK_TRANSFER).type(Payment.Type.PAYOUT)
                .status(Payment.Status.PENDING).build());
    }

    @Transactional(readOnly = true)
    public List<PaymentDto> history(Long userId) {
        return payments.findByUserIdOrderByCreatedAtDesc(userId).stream().map(Mapper::payment).toList();
    }

    private Payment charge(Booking b, User payer, BigDecimal amount, Payment.Method method, String token, Payment.Type type) {
        var result = gateway.charge(amount, b.getCurrency(), method, token, "booking-" + b.getId() + "-" + type);
        Payment p = payments.save(Payment.builder().booking(b).user(payer).amount(amount).currency(b.getCurrency())
                .method(method).type(type)
                .status(result.success() ? Payment.Status.SUCCEEDED : Payment.Status.FAILED)
                .providerRef(result.providerRef()).build());
        if (!result.success()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "Payment failed: " + result.failureReason());
        }
        return p;
    }

    private static BigDecimal paidAmount(List<Payment> list) {
        return list.stream()
                .filter(p -> p.getStatus() == Payment.Status.SUCCEEDED
                        && (p.getType() == Payment.Type.DEPOSIT || p.getType() == Payment.Type.FULL || p.getType() == Payment.Type.BALANCE))
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
