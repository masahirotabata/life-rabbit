package com.example.todomoney.security;

<<<<<<< HEAD
<<<<<<< HEAD
import com.example.todomoney.repo.UserRepository;
=======
import java.util.List;

>>>>>>> af109e6 (cors修正)
=======
import com.example.todomoney.repo.UserRepository;
>>>>>>> 872222e (cors修正)
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

<<<<<<< HEAD
// ★ CORS 用の import
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

=======
>>>>>>> 872222e (cors修正)
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public JwtAuthFilter jwtAuthFilter(JwtService jwtService, UserRepository userRepo) {
    return new JwtAuthFilter(jwtService, userRepo);
  }

<<<<<<< HEAD
<<<<<<< HEAD
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

=======
  // ★ CORS 設定（フロント & ローカル開発用オリジンを許可）
>>>>>>> af109e6 (cors修正)
=======
  // ★ CORS 設定（フロント & API オリジンを許可）
>>>>>>> 872222e (cors修正)
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 872222e (cors修正)
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
<<<<<<< HEAD
=======
        .csrf(csrf -> csrf.disable())
        // ★ ここで上の corsConfigurationSource を使う
        .cors(cors -> cors.configurationSource(corsConfigurationSource))
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(e -> e.authenticationEntryPoint(
            new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
        .authorizeHttpRequests(auth -> auth
            // Preflight 対策
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            // register/login は認証不要
            .requestMatchers("/api/auth/**").permitAll()
            // health チェック
            .requestMatchers("/actuator/health").permitAll()
            // エラーページ
            .requestMatchers("/error").permitAll()
            // それ以外は JWT 必須
            .anyRequest().authenticated())
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
        .httpBasic(b -> b.disable())
        .formLogin(f -> f.disable());
>>>>>>> af109e6 (cors修正)
=======
>>>>>>> 872222e (cors修正)

    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}