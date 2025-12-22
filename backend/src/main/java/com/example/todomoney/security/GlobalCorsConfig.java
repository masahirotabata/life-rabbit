package com.example.todomoney.config;

import java.util.List;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class GlobalCorsConfig {

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // フロントからのクッキー／Authorization を許可する場合は true
        config.setAllowCredentials(true);

        // 許可するオリジン
        config.setAllowedOriginPatterns(List.of(
                "https://liferabbit-todo-web.onrender.com",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        ));

        // 全てのヘッダを許可（必要に応じて絞ってOK）
        config.setAllowedHeaders(List.of("*"));

        // 許可する HTTP メソッド
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        // SecurityFilter よりも前に動くよう order=0 にしておく
        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
        bean.setOrder(0);
        return bean;
    }
}
