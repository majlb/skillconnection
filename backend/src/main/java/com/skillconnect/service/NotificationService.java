package com.skillconnect.service;

import com.skillconnect.config.AppProperties;
import com.skillconnect.domain.Notification;
import com.skillconnect.domain.User;
import com.skillconnect.dto.Dtos.NotificationDto;
import com.skillconnect.dto.Dtos.PageResponse;
import com.skillconnect.dto.Mapper;
import com.skillconnect.repository.Repositories.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Fan-out of in-app (WebSocket push), email and SMS notifications. */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notifications;
    private final SimpMessagingTemplate ws;
    private final ExternalChannels external;

    @Transactional
    public void notify(User user, Notification.Type type, String title, String body, String link) {
        Notification n = notifications.save(Notification.builder()
                .user(user).type(type).title(title).body(body).link(link).build());
        NotificationDto dto = Mapper.notification(n);
        ws.convertAndSendToUser(String.valueOf(user.getId()), "/queue/notifications", dto);
        external.email(user.getEmail(), title, body);
        if (type == Notification.Type.BOOKING_CONFIRMED || type == Notification.Type.BOOKING_REMINDER
                || type == Notification.Type.BOOKING_CANCELLED) {
            external.sms(user.getPhone(), title + ": " + body);
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> list(Long userId, int page, int size) {
        var p = notifications.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, Math.min(size, 100)));
        return new PageResponse<>(p.map(Mapper::notification).getContent(), page, size, p.getTotalElements());
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notifications.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(Long userId, Long id) {
        notifications.findById(id).filter(n -> n.getUser().getId().equals(userId)).ifPresent(n -> n.setRead(true));
    }

    @Transactional
    public void markAllRead(Long userId) {
        notifications.markAllRead(userId);
    }

    /** Email / SMS delivery, executed asynchronously so request latency is not affected. */
    @Slf4j
    @Component
    @RequiredArgsConstructor
    public static class ExternalChannels {
        private final AppProperties props;
        private final ObjectProvider<JavaMailSender> mailSender;

        @Async
        public void email(String to, String subject, String body) {
            if (!props.notifications().emailEnabled() || to == null) return;
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setTo(to);
                msg.setSubject("[SkillConnect] " + subject);
                msg.setText(body == null ? subject : body);
                mailSender.getObject().send(msg);
            } catch (Exception e) {
                log.warn("Email delivery failed: {}", e.getMessage());
            }
        }

        /** Plug in Twilio or Azure Communication Services here. */
        @Async
        public void sms(String phone, String text) {
            if (!props.notifications().smsEnabled() || phone == null || phone.isBlank()) return;
            log.info("SMS queued to {}", phone.replaceAll("\\d(?=\\d{3})", "*"));
        }
    }
}
