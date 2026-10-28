package com.skillconnect.service;

import com.skillconnect.domain.Message;
import com.skillconnect.domain.Role;
import com.skillconnect.domain.User;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.dto.Mapper;
import com.skillconnect.exception.ApiException;
import com.skillconnect.repository.Repositories.BookingRepository;
import com.skillconnect.repository.Repositories.MessageRepository;
import com.skillconnect.repository.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatService {

    private final MessageRepository messages;
    private final UserRepository users;
    private final BookingRepository bookings;
    private final SimpMessagingTemplate ws;

    public MessageDto send(Long senderId, SendMessageRequest req) {
        if (senderId.equals(req.recipientId())) throw ApiException.badRequest("Cannot message yourself");
        User sender = users.getReferenceById(senderId);
        User recipient = users.findById(req.recipientId()).filter(User::isEnabled)
                .orElseThrow(() -> ApiException.notFound("Recipient"));
        // Anyone may contact an instructor; other conversations require an existing thread or booking.
        boolean allowed = recipient.hasRole(Role.INSTRUCTOR)
                || messages.existsBySenderIdAndRecipientId(recipient.getId(), senderId)
                || bookings.existsByCustomerIdAndInstructorUserId(recipient.getId(), senderId);
        if (!allowed) throw ApiException.forbidden();
        Message m = messages.save(Message.builder().sender(sender).recipient(recipient)
                .content(req.content().strip()).build());
        MessageDto dto = Mapper.message(m);
        ws.convertAndSendToUser(String.valueOf(recipient.getId()), "/queue/messages", dto);
        ws.convertAndSendToUser(String.valueOf(senderId), "/queue/messages", dto);
        return dto;
    }

    public List<MessageDto> conversation(Long userId, Long partnerId) {
        messages.markRead(userId, partnerId);
        return messages.conversation(userId, partnerId).stream().map(Mapper::message).toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> conversations(Long userId) {
        return messages.latestPerConversation(userId).stream().map(m -> {
            User partner = m.getSender().getId().equals(userId) ? m.getRecipient() : m.getSender();
            boolean unread = m.getRecipient().getId().equals(userId) && m.getReadAt() == null;
            return new ConversationDto(partner.getId(), partner.getFullName(), partner.getAvatarUrl(),
                    m.getContent(), m.getCreatedAt(), unread);
        }).toList();
    }
}
