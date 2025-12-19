package com.example.todomoney.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

  private final byte[] keyBytes;
  private final String issuer;
  private final long expiresMinutes;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.issuer}") String issuer,
      @Value("${app.jwt.expiresMinutes:60}") long expiresMinutes
  ) {
    this.keyBytes = secret.getBytes(StandardCharsets.UTF_8);
    this.issuer = issuer;
    this.expiresMinutes = expiresMinutes;
  }

  public String issueToken(long userId, String email) {
    Instant now = Instant.now();
    Instant exp = now.plus(expiresMinutes, ChronoUnit.MINUTES);

    return Jwts.builder()
        .issuer(issuer)
        .subject(String.valueOf(userId))
        .claim("email", email)
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .signWith(Keys.hmacShaKeyFor(keyBytes), Jwts.SIG.HS256)
        .compact();
  }

  public JwtPayload verify(String token) {
    var claims = Jwts.parser()
        .verifyWith(Keys.hmacShaKeyFor(keyBytes))
        .build()
        .parseSignedClaims(token)
        .getPayload();

    long userId = Long.parseLong(claims.getSubject());
    String email = claims.get("email", String.class);
    return new JwtPayload(userId, email);
  }

  public record JwtPayload(long userId, String email) {}
}
