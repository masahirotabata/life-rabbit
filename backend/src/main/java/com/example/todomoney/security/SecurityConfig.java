package com.example.todomoney.security;

import java.util.List;

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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.todomoney.repo.UserRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public JwtAuthFilter jwtAuthFilter(JwtService jwtService, UserRepository userRepo) {
    return new JwtAuthFilter(jwtService, userRepo);
  }

  // ★ CORS 設定はここだけ
  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();

    // 許可するオリジン
    config.setAllowedOrigins(List.of(
        "https://liferabbit-todo-web.onrender.com", // 本番フロント
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ));

    // 許可する HTTP メソッド
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

    // 許可するヘッダ
    config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));

    // Cookie を使わないので false で OK（Authorization ヘッダはこれで問題なく使えます）
    config.setAllowCredentials(false);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
    http
      .csrf(csrf -> csrf.disable())
      // ★ 上の corsConfigurationSource を使う
      .cors(cors -> cors.configurationSource(corsConfigurationSource()))
      .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
      .authorizeHttpRequests(auth -> auth
        // Preflight
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        // register/login
        .requestMatchers("/api/auth/**").permitAll()
        // health
        .requestMatchers("/actuator/health").permitAll()
        // error ページ
        .requestMatchers("/error").permitAll()
        // その他は JWT 必須
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
