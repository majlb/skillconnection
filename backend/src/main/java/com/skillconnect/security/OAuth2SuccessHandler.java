package com.skillconnect.security;

import com.skillconnect.config.AppProperties;
import com.skillconnect.domain.Role;
import com.skillconnect.domain.User;
import com.skillconnect.repository.Repositories.RoleRepository;
import com.skillconnect.repository.Repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Completes Google / Facebook sign-in: upserts the local user and redirects to the SPA with tokens in the
 * URL fragment (fragments are never sent to servers, so tokens don't end up in access logs).
 */
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository users;
    private final RoleRepository roles;
    private final JwtService jwtService;
    private final AppProperties props;

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        var token = (OAuth2AuthenticationToken) authentication;
        OAuth2User principal = token.getPrincipal();
        String provider = token.getAuthorizedClientRegistrationId().toUpperCase();

        String email = principal.getAttribute("email");
        if (email == null) {
            response.sendRedirect(props.frontendUrl() + "/login?error=email_required");
            return;
        }
        String name = principal.getAttribute("name");
        String providerId = provider.equals("GOOGLE") ? principal.getAttribute("sub") : principal.getAttribute("id");
        String picture = provider.equals("GOOGLE") ? principal.getAttribute("picture") : null;

        User user = users.findByEmailIgnoreCase(email).orElseGet(() -> {
            User u = User.builder()
                    .email(email.toLowerCase())
                    .fullName(name != null ? name : email)
                    .avatarUrl(picture)
                    .authProvider(User.AuthProvider.valueOf(provider))
                    .providerId(providerId)
                    .build();
            u.getRoles().add(roles.findByName(Role.CUSTOMER).orElseThrow());
            return users.save(u);
        });

        if (!user.isEnabled()) {
            response.sendRedirect(props.frontendUrl() + "/login?error=account_disabled");
            return;
        }

        String fragment = "access=" + enc(jwtService.createAccessToken(user))
                + "&refresh=" + enc(jwtService.createRefreshToken(user));
        response.sendRedirect(props.frontendUrl() + "/oauth/callback#" + fragment);
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
