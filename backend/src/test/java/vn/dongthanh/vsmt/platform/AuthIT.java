package vn.dongthanh.vsmt.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.domain.UserStatus;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Import(AuthIT.ProbeController.class)
class AuthIT extends IntegrationTest {

    static final String PASSWORD = "Thu@12345";

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    ObjectMapper json;

    @BeforeEach
    void seedUsers() {
        users.deleteAll();
        String hash = encoder.encode(PASSWORD);
        users.save(User.create("canbo_a", "Cán bộ A", Role.COMMUNE_OFFICER, null, hash));
        users.save(User.create("dv07", "Công ty 07", Role.COMPANY_MANAGER, 7L, hash));
        User locked = User.create("bi_khoa", "Bị khóa", Role.ADMIN, null, hash);
        locked.setStatus(UserStatus.LOCKED);
        users.save(locked);
    }

    @Test
    void wrongPasswordReturns401InVietnamese() throws Exception {
        login("canbo_a", "sai-mat-khau")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Tên đăng nhập hoặc mật khẩu không đúng."));
    }

    @Test
    void unknownUserReturnsSame401AsWrongPassword() throws Exception {
        login("khong_ton_tai", PASSWORD)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void lockedAccountCannotLogIn() throws Exception {
        login("bi_khoa", PASSWORD)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    void blankPasswordIsValidationError() throws Exception {
        login("canbo_a", "")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void correctLoginReturnsTokenAndMeReturnsRole() throws Exception {
        login(" CANBO_A ", PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("COMMUNE_OFFICER"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());

        mvc.perform(get("/api/platform/auth/me").header(HttpHeaders.AUTHORIZATION, bearer("canbo_a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("canbo_a"))
                .andExpect(jsonPath("$.fullName").value("Cán bộ A"))
                .andExpect(jsonPath("$.role").value("COMMUNE_OFFICER"))
                .andExpect(jsonPath("$.companyId").doesNotExist());

        assertThat(users.findByUsername("canbo_a").orElseThrow().getLastLoginAt()).isNotNull();
    }

    @Test
    void companyManagerMeIncludesCompanyId() throws Exception {
        mvc.perform(get("/api/platform/auth/me").header(HttpHeaders.AUTHORIZATION, bearer("dv07")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("COMPANY_MANAGER"))
                .andExpect(jsonPath("$.companyId").value(7));
    }

    @Test
    void companyManagerCallingCommuneOnlyEndpointGets403() throws Exception {
        mvc.perform(get("/api/test/commune-only").header(HttpHeaders.AUTHORIZATION, bearer("dv07")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.message").value(startsWith("Bạn không có quyền")));

        mvc.perform(get("/api/test/commune-only").header(HttpHeaders.AUTHORIZATION, bearer("canbo_a")))
                .andExpect(status().isOk());
    }

    @Test
    void companyScopeBlocksOtherCompanies() throws Exception {
        String dv07 = bearer("dv07");
        mvc.perform(get("/api/test/companies/7").header(HttpHeaders.AUTHORIZATION, dv07)).andExpect(status().isOk());
        mvc.perform(get("/api/test/companies/8").header(HttpHeaders.AUTHORIZATION, dv07))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/test/companies/8").header(HttpHeaders.AUTHORIZATION, bearer("canbo_a")))
                .andExpect(status().isOk());
    }

    @Test
    void missingOrInvalidTokenReturns401Json() throws Exception {
        mvc.perform(get("/api/platform/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mvc.perform(get("/api/platform/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer khong-phai-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        String token = bearer("dv07");
        int sig = token.lastIndexOf('.') + 1;
        char swapped = token.charAt(sig) == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, sig) + swapped + token.substring(sig + 1);
        mvc.perform(get("/api/platform/auth/me").header(HttpHeaders.AUTHORIZATION, tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() throws Exception {
        var key = new SecretKeySpec("khoa-cua-ke-gia-mao-dai-hon-32-ky-tu-0123".getBytes(StandardCharsets.UTF_8),
                "HmacSHA256");
        var claims = JwtClaimsSet.builder().issuer("vsmt").subject("1")
                .claim("username", "gia_mao").claim("role", "ADMIN")
                .expiresAt(java.time.Instant.now().plusSeconds(600)).build();
        String forged = new NimbusJwtEncoder(new ImmutableSecret<>(key))
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        mvc.perform(get("/api/platform/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    private ResultActions login(String username, String password) throws Exception {
        String body = json.writeValueAsString(java.util.Map.of("username", username, "password", password));
        return mvc.perform(post("/api/platform/auth/login").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String bearer(String username) throws Exception {
        String response = login(username, PASSWORD).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode node = json.readTree(response);
        return "Bearer " + node.get("accessToken").asText();
    }

    /** Endpoint thử chỉ có trong test: kiểm tra vai trò và phạm vi công ty qua CurrentUser. */
    @RestController
    static class ProbeController {

        @GetMapping("/api/test/commune-only")
        String communeOnly(@AuthenticationPrincipal CurrentUser actor) {
            actor.requireRole(Role.COMMUNE_OFFICER);
            return "ok";
        }

        @GetMapping("/api/test/companies/{companyId}")
        String company(@AuthenticationPrincipal CurrentUser actor, @PathVariable Long companyId) {
            actor.requireCompany(companyId);
            return "ok";
        }
    }
}
