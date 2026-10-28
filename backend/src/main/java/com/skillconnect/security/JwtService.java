package com.skillconnect.security;

import com.skillconnect.config.AppProperties;
import com.skillconnect.domain.Role;
import com.skillconnect.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class JwtService {

    private static final String ISSUER = "postgres";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final SecretKey key;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtService(AppProperties props) {
        byte[] bytes = Decoders.BASE64.decode(props.jwt().secret());
        if (bytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 256 bits");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.accessTtl = props.jwt().accessTokenTtl();
        this.refreshTtl = props.jwt().refreshTokenTtl();
    }

    public String createAccessToken(User user) {
        List<String> roles = user.getRoles().stream().map(Role::getName).toList();
        return build(user, TYPE_ACCESS, accessTtl, roles);
    }

    public String createRefreshToken(User user) {
        return build(user, TYPE_REFRESH, refreshTtl, List.of());
    }

    public long accessTtlSeconds() {
        return accessTtl.toSeconds();
    }

    public AuthUser parseAccessToken(String token) {
        Claims claims = parse(token, TYPE_ACCESS);
        @SuppressWarnings("unchecked")
        List<String> roles = claims.get("roles", List.class);
        return new AuthUser(Long.valueOf(claims.getSubject()), claims.get("email", String.class),
                roles == null ? Set.of() : new HashSet<>(roles));
    }

    public Long parseRefreshToken(String token) {
        return Long.valueOf(parse(token, TYPE_REFRESH).getSubject());
    }

    private String build(User user, String type, Duration ttl, List<String> roles) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .subject(String.valueOf(user.getId()))
                .claim("typ", type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)));
        if (TYPE_ACCESS.equals(type)) {
            builder.claim("email", user.getEmail()).claim("roles", roles);
        }
        return builder.signWith(key).compact();
    }

    private Claims parse(String token, String expectedType) {
        Claims claims = Jwts.parser().verifyWith(key).requireIssuer(ISSUER).build()
                .parseSignedClaims(token).getPayload();
        if (!expectedType.equals(claims.get("typ", String.class))) {
            throw new JwtException("Unexpected token type");
        }
        return claims;
    }
}
