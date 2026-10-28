package com.skillconnect.service;

import com.skillconnect.domain.*;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.dto.Mapper;
import com.skillconnect.exception.ApiException;
import com.skillconnect.repository.Repositories.*;
import com.skillconnect.security.JwtService;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository users;
    private final RoleRepository roles;
    private final InstructorRepository instructors;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest req) {
        if (users.existsByEmailIgnoreCase(req.email())) {
            throw ApiException.conflict("An account with this email already exists");
        }
        User user = User.builder()
                .email(req.email().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .fullName(req.fullName().trim())
                .phone(req.phone())
                .build();
        user.getRoles().add(roles.findByName(Role.CUSTOMER).orElseThrow());
        if (Role.INSTRUCTOR.equals(req.role())) {
            user.getRoles().add(roles.findByName(Role.INSTRUCTOR).orElseThrow());
        }
        users.save(user);

        if (user.hasRole(Role.INSTRUCTOR)) {
            Instructor instructor = Instructor.builder().user(user).build();
            instructor.setProfile(InstructorProfile.builder().instructor(instructor).build());
            instructors.save(instructor);
        }
        return issue(user);
    }

    public AuthResponse login(LoginRequest req) {
        User user = users.findByEmailIgnoreCase(req.email())
                .filter(u -> u.getPasswordHash() != null && passwordEncoder.matches(req.password(), u.getPasswordHash()))
                // Same message for unknown email and wrong password to prevent account enumeration.
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account disabled");
        }
        return issue(user);
    }

    public AuthResponse refresh(RefreshRequest req) {
        Long userId;
        try {
            userId = jwtService.parseRefreshToken(req.refreshToken());
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        User user = users.findById(userId).filter(User::isEnabled)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        return issue(user);
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        return toDto(user);
    }

    public UserDto toDto(User user) {
        Long instructorId = instructors.findByUserId(user.getId()).map(Instructor::getId).orElse(null);
        return Mapper.user(user, instructorId);
    }

    private AuthResponse issue(User user) {
        return new AuthResponse(jwtService.createAccessToken(user), jwtService.createRefreshToken(user),
                jwtService.accessTtlSeconds(), toDto(user));
    }
}
