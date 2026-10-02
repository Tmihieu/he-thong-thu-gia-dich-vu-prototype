package vn.dongthanh.vsmt.platform.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.util.AntPathMatcher;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vn.dongthanh.vsmt.platform.common.ApiError;
import vn.dongthanh.vsmt.platform.common.GlobalExceptionHandler;
import vn.dongthanh.vsmt.platform.domain.Role;

/**
 * API không trạng thái, xác thực bằng Bearer JWT (HS256, khóa từ {@code JWT_SECRET}).
 * Swagger và đăng nhập mở công khai; mọi API khác cần token. Token người dân chỉ dùng được cho
 * {@code /api/citizen/**}, token nội bộ thì ngược lại (G8). Lỗi 401/403 trả {@link ApiError} tiếng Việt.
 */
@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

    static final String LOGIN_PATH = "/api/platform/auth/login";
    static final String[] CITIZEN_LOGIN_PATHS = {"/api/citizen/auth/otp/request", "/api/citizen/auth/otp/verify"};
    static final String CITIZEN_PATHS = "/api/citizen/**";
    /** Đọc chợ: người dân và cán bộ xã (người quản lý chợ), chỉ GET (docs/cho-do-cu-spec.md §10). */
    static final String MARKET_READ_PATHS = "/api/market/**";
    static final String[] PUBLIC_PATHS = {"/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**", "/error"};
    private static final Set<String> INTERNAL_AUTHORITIES = Arrays.stream(Role.values())
            .map(r -> "ROLE_" + r.name()).collect(Collectors.toSet());
    /** Lãnh đạo chỉ đọc (SPEC §9.10): ngoài GET chỉ được duyệt đề nghị và đánh dấu đã đọc thông báo. */
    static final String[] LEADER_WRITE_PATHS = {"/api/leadership/**", "/api/notifications/**"};
    private static final AntPathMatcher PATHS = new AntPathMatcher();

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper json, JwtDecoder jwtDecoder)
            throws Exception {
        AuthenticationEntryPoint unauthorized = (req, res, e) -> write(res, json, HttpStatus.UNAUTHORIZED,
                new ApiError(GlobalExceptionHandler.UNAUTHORIZED,
                        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại."));
        AccessDeniedHandler forbidden = (req, res, e) -> write(res, json, HttpStatus.FORBIDDEN,
                new ApiError(GlobalExceptionHandler.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này."));

        return http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .requestMatchers(HttpMethod.POST, LOGIN_PATH).permitAll()
                        .requestMatchers(HttpMethod.POST, CITIZEN_LOGIN_PATHS).permitAll()
                        .requestMatchers(CITIZEN_PATHS).hasAuthority(CurrentCitizenAuthentication.AUTHORITY)
                        .requestMatchers(HttpMethod.GET, MARKET_READ_PATHS).access((a, ctx) -> new AuthorizationDecision(
                                a.get().getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(g ->
                                        g.equals(CurrentCitizenAuthentication.AUTHORITY)
                                                || g.equals("ROLE_" + Role.COMMUNE_OFFICER.name()))))
                        .requestMatchers(MARKET_READ_PATHS).denyAll()
                        .anyRequest().access(SecurityConfig::internalAccess))
                .oauth2ResourceServer(rs -> rs
                        .jwt(jwt -> jwt.decoder(jwtDecoder).jwtAuthenticationConverter(SecurityConfig::authenticate))
                        .authenticationEntryPoint(unauthorized)
                        .accessDeniedHandler(forbidden))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .build();
    }

    /**
     * Mọi vai trò nội bộ được vào; riêng lãnh đạo bị chặn mọi lệnh ghi ngoài {@link #LEADER_WRITE_PATHS}, một chỗ
     * chung thay cho kiểm từng service (API ghi nghiệp vụ mới tự động bị chặn với lãnh đạo).
     */
    static AuthorizationDecision internalAccess(Supplier<Authentication> authentication, RequestAuthorizationContext ctx) {
        Set<String> granted = authentication.get().getAuthorities().stream().map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
        if (granted.stream().noneMatch(INTERNAL_AUTHORITIES::contains)) {
            return new AuthorizationDecision(false);
        }
        HttpServletRequest req = ctx.getRequest();
        boolean read = HttpMethod.GET.matches(req.getMethod()) || HttpMethod.HEAD.matches(req.getMethod());
        boolean leaderBlocked = granted.contains("ROLE_" + Role.LEADER.name()) && !read
                && Arrays.stream(LEADER_WRITE_PATHS).noneMatch(p -> PATHS.match(p, req.getRequestURI()));
        return new AuthorizationDecision(!leaderBlocked);
    }

    static AbstractAuthenticationToken authenticate(Jwt jwt) {
        return CurrentCitizen.isCitizenToken(jwt)
                ? new CurrentCitizenAuthentication(CurrentCitizen.fromJwt(jwt), jwt)
                : CurrentUserAuthentication.from(jwt);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    JwtEncoder jwtEncoder(JwtProperties props) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey(props)));
    }

    @Bean
    JwtDecoder jwtDecoder(JwtProperties props) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey(props))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(props.issuer()));
        return decoder;
    }

    private static SecretKey secretKey(JwtProperties props) {
        return new SecretKeySpec(props.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    private static void write(HttpServletResponse res, ObjectMapper json, HttpStatus status, ApiError body)
            throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        json.writeValue(res.getOutputStream(), body);
    }
}
