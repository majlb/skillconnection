package com.skillconnect.security;

import java.util.Set;

/** Authenticated principal extracted from a validated JWT. */
public record AuthUser(Long id, String email, Set<String> roles) {
    public boolean isAdmin() {
        return roles.contains("ADMIN");
    }
}
