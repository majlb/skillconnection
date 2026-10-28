package com.skillconnect.web;

import com.skillconnect.dto.Dtos.*;
import com.skillconnect.security.AuthUser;
import com.skillconnect.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return authService.refresh(req);
    }

    /** Social login: the SPA navigates to /oauth2/authorization/{google|facebook}; see OAuth2SuccessHandler. */
    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AuthUser user) {
        if (user == null) {
            throw new com.skillconnect.exception.ApiException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return authService.me(user.id());
    }
}
