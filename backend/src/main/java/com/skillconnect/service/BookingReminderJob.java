package com.skillconnect.service;

import com.skillconnect.domain.Booking;
import com.skillconnect.domain.Notification;
import com.skillconnect.repository.Repositories.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/** Sends a reminder ~24h before each confirmed session. Use ShedLock when running more than one replica. */
@Component
@RequiredArgsConstructor
public class BookingReminderJob {

    private final BookingRepository bookings;
    private final NotificationService notifications;

    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT1M")
    @Transactional
    public void sendReminders() {
        Instant now = Instant.now();
        for (Booking b : bookings.findByStatusAndReminderSentFalseAndStartAtBetween(
                Booking.Status.CONFIRMED, now, now.plus(Duration.ofHours(24)))) {
            String body = b.getService().getName() + " starts at " + b.getStartAt()
                    + (b.getMeetingUrl() != null ? ". Join: " + b.getMeetingUrl() : "");
            notifications.notify(b.getCustomer(), Notification.Type.BOOKING_REMINDER, "Upcoming session", body, "/dashboard");
            notifications.notify(b.getInstructor().getUser(), Notification.Type.BOOKING_REMINDER, "Upcoming session", body, "/instructor/bookings");
            b.setReminderSent(true);
        }
    }
}
