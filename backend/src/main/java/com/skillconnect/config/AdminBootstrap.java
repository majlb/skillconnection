package com.skillconnect.config;

import com.skillconnect.domain.Role;
import com.skillconnect.domain.User;
import com.skillconnect.repository.Repositories.RoleRepository;
import com.skillconnect.repository.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Creates the initial admin account from ADMIN_EMAIL / ADMIN_PASSWORD if both are provided. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;

    @Value("${ADMIN_EMAIL:}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminEmail.isBlank() || adminPassword.isBlank() || users.existsByEmailIgnoreCase(adminEmail)) {
            return;
        }
        User admin = User.builder().email(adminEmail.toLowerCase()).fullName("Administrator")
                .passwordHash(encoder.encode(adminPassword)).build();
        admin.getRoles().add(roles.findByName(Role.ADMIN).orElseThrow());
        users.save(admin);
        log.info("Bootstrap admin account created: {}", adminEmail);
    }
}
