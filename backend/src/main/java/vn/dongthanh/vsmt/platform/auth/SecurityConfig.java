package vn.dongthanh.vsmt.platform.auth;

import java.io.IOException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletResponse;
import vn.dongthanh.vsmt.platform.common.ApiError;
import vn.dongthanh.vsmt.platform.common.GlobalExceptionHandler;

/**
 * Khung bảo mật: API không trạng thái, Swagger mở công khai, mọi API khác cần đăng nhập.
 * Đăng nhập JWT và kiểm tra vai trò được thêm ở T06.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    static final String[] PUBLIC_PATHS = {"/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**", "/error"};

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper json) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) -> write(res, json, HttpStatus.UNAUTHORIZED,
                                new ApiError(GlobalExceptionHandler.UNAUTHORIZED,
                                        "Bạn cần đăng nhập để thực hiện thao tác này.")))
                        .accessDeniedHandler((req, res, e) -> write(res, json, HttpStatus.FORBIDDEN,
                                new ApiError(GlobalExceptionHandler.FORBIDDEN,
                                        "Bạn không có quyền thực hiện thao tác này."))))
                .build();
    }

    private static void write(HttpServletResponse res, ObjectMapper json, HttpStatus status, ApiError body)
            throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        json.writeValue(res.getOutputStream(), body);
    }
}
