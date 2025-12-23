package com.example.todomoney.security;

import java.io.IOException;
import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.todomoney.entity.UserEntity; // ←あなたのUserEntityのパッケージに合わせて
import com.example.todomoney.repo.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepo;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepo) {
        this.jwtService = jwtService;
        this.userRepo = userRepo;
    }

    // ★ auth系/health/error/OPTIONS はフィルタ処理を完全スキップ
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();

        if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;
        if (path.startsWith("/api/auth/")) return true;
        if (path.startsWith("/actuator/")) return true;
        if (path.equals("/error")) return true;

        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        // すでに認証済みなら何もしない
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            chain.doFilter(request, response);
            return;
        }

        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);

        // ★ token が無いなら「401にしない」。そのまま次へ。
        //   （保護APIなら最終的にSpring Securityが401にする）
        if (!StringUtils.hasText(auth) || !auth.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = auth.substring(7).trim();

        try {
            // 例：tokenからemail(=subject)を取り出す想定
            String email = jwtService.extractEmail(token); // ←メソッド名はあなたのJwtServiceに合わせて
            if (!StringUtils.hasText(email) || !jwtService.isValid(token)) { // ←同上
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }

            Optional<UserEntity> opt = userRepo.findByEmail(email); // ←リポジトリに合わせて
            if (opt.isEmpty()) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }

            UserEntity user = opt.get();

            // 権限を使ってないなら空でOK
            var authToken = new UsernamePasswordAuthenticationToken(
                user, null, java.util.List.of()
            );
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);

            chain.doFilter(request, response);

        } catch (Exception ex) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        }
    }
}
