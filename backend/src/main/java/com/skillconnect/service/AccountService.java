package com.skillconnect.service;

import com.skillconnect.domain.Favorite;
import com.skillconnect.domain.Instructor;
import com.skillconnect.domain.User;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.exception.ApiException;
import com.skillconnect.repository.Repositories.FavoriteRepository;
import com.skillconnect.repository.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/** Account settings and favorites for any signed-in user. */
@Service
@RequiredArgsConstructor
@Transactional
public class AccountService {

    private final UserRepository users;
    private final FavoriteRepository favorites;
    private final InstructorService instructorService;
    private final StorageService storage;
    private final AuthService authService;

    public UserDto updateProfile(Long userId, UpdateProfileRequest req) {
        User u = require(userId);
        u.setFullName(req.fullName());
        u.setAge(req.age());
        u.setGender(req.gender());
        u.setPhone(req.phone());
        if (req.preferredLanguage() != null) u.setPreferredLanguage(req.preferredLanguage());
        return authService.toDto(u);
    }

    public UserDto uploadAvatar(Long userId, MultipartFile file) {
        User u = require(userId);
        String name = storage.store(StorageService.Bucket.AVATARS, file);
        u.setAvatarUrl("/api/files/avatars/" + name);
        return authService.toDto(u);
    }

    @Transactional(readOnly = true)
    public List<InstructorSummaryDto> favorites(Long userId) {
        List<Instructor> list = favorites.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(Favorite::getInstructor).toList();
        return instructorService.summarize(list, Map.of());
    }

    public void addFavorite(Long userId, Long instructorId) {
        if (favorites.findByUserIdAndInstructorId(userId, instructorId).isPresent()) return;
        Instructor i = instructorService.requirePublic(instructorId);
        favorites.save(Favorite.builder().user(users.getReferenceById(userId)).instructor(i).build());
    }

    public void removeFavorite(Long userId, Long instructorId) {
        favorites.findByUserIdAndInstructorId(userId, instructorId).ifPresent(favorites::delete);
    }

    private User require(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }
}
