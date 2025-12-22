package com.example.todomoney.security;

import com.example.todomoney.repo.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

// ★ CORS 用の import
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public JwtAuthFilter jwtAuthFilter(JwtService jwtService, UserRepository userRepo) {
    return new JwtAuthFilter(jwtService, userRepo);
  }

  // ★ CORS 設定（フロント & API オリジンを許可）
  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration c = new CorsConfiguration();

    // フロント & API オリジン
    c.setAllowedOrigins(List.of(
      "https://liferabbit-todo-web.onrender.com", // フロント
      "https://liferabbit-api.onrender.com",      // API（入れておいてもOK）
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ));

    c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
    c.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", c);
    return source;
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
    http
      .csrf(csrf -> csrf.disable())
      // 上で定義した corsConfigurationSource() が自動で使われる
      .cors(cors -> {})
      .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

      // 認証できてない時に 403 ではなく 401 を返す（デバッグしやすくなる）
      .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))

      .authorizeHttpRequests(auth -> auth
        // Preflight 対策（ブラウザから呼ぶならほぼ必須）
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

        // register/login はOK
        .requestMatchers("/api/auth/**").permitAll()

        // actuator health を確認したいなら許可（他のactuatorは閉じたまま）
        .requestMatchers("/actuator/health").permitAll()

        // Springのエラーページ
        .requestMatchers("/error").permitAll()

        // それ以外はJWT必須
        .anyRequest().authenticated()
      )
      .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
      .httpBasic(b -> b.disable())
      .formLogin(f -> f.disable());

    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
