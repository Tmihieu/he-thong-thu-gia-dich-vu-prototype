package vn.dongthanh.vsmt.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** T51: quản trị tạo / sửa / khóa / đặt lại mật khẩu tài khoản; chỉ ADMIN; có nhật ký, không lộ mật khẩu. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class UserAdminIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired JdbcTemplate jdbc;

    String admin;

    @BeforeEach
    void seed() {
        cleaner.truncateAll();
        fx.build();
        admin = fx.bearer(fx.admin);
    }

    @Test
    void adminCreatesCollectorForDv01WhoCanLogIn() throws Exception {
        long id = createCollector("Thu07B").andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("thu07b"))
                .andExpect(jsonPath("$.companyId").value(fx.dv01.getId()))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn().getResponse().getContentAsString().transform(this::id);

        login("thu07b", "MatKhau@1").andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("COLLECTOR"));
        mvc.perform(get("/api/platform/users").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(jsonPath("$[?(@.id == %d)].username".formatted(id)).value("thu07b"));

        String after = jdbc.queryForObject("select after_data::text from audit_logs where action = 'CREATE_USER'",
                String.class);
        assertThat(after).contains("thu07b").doesNotContain("MatKhau").doesNotContain("$2a$");
    }

    @Test
    void onlyAdminManagesAccounts() throws Exception {
        for (String who : new String[] {fx.bearer(fx.officer), fx.bearer(fx.dv01Manager), fx.bearer(fx.thu07)}) {
            mvc.perform(get("/api/platform/users").header(HttpHeaders.AUTHORIZATION, who)).andExpect(status().isForbidden());
            mvc.perform(post("/api/platform/users").header(HttpHeaders.AUTHORIZATION, who)
                            .contentType(MediaType.APPLICATION_JSON).content(collectorBody("x_" + who.length())))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void validatesRoleCompanyUsernameAndPassword() throws Exception {
        send(post("/api/platform/users"), """
                {"username":"thu_moi","fullName":"A","role":"COLLECTOR","password":"MatKhau@1"}""")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("USER_COMPANY_REQUIRED"));
        send(post("/api/platform/users"), """
                {"username":"Có dấu","fullName":"A","role":"ADMIN","password":"MatKhau@1"}""")
                .andExpect(status().isBadRequest());
        send(post("/api/platform/users"), """
                {"username":"ngan","fullName":"A","role":"ADMIN","password":"1234567"}""")
                .andExpect(status().isBadRequest());
        createCollector("thu07b").andExpect(status().isCreated());
        createCollector("THU07B").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
        // Vai trò không thuộc công ty thì bỏ công ty client gửi kèm.
        send(post("/api/platform/users"), """
                {"username":"canbo2","fullName":"A","role":"COMMUNE_OFFICER","companyId":%d,"password":"MatKhau@1"}"""
                .formatted(fx.dv01.getId()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.companyId").isEmpty());
    }

    @Test
    void lockedAccountCannotLogInUntilUnlocked() throws Exception {
        long id = id(createCollector("thu07b").andReturn().getResponse().getContentAsString());

        send(post("/api/platform/users/%d/lock".formatted(id)), null).andExpect(jsonPath("$.status").value("LOCKED"));
        login("thu07b", "MatKhau@1").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));

        send(post("/api/platform/users/%d/unlock".formatted(id)), null).andExpect(jsonPath("$.status").value("ACTIVE"));
        login("thu07b", "MatKhau@1").andExpect(status().isOk());
    }

    @Test
    void resetPasswordReplacesOldOne() throws Exception {
        long id = id(createCollector("thu07b").andReturn().getResponse().getContentAsString());

        send(post("/api/platform/users/%d/password".formatted(id)), "{\"password\":\"MoiHon@2026\"}")
                .andExpect(status().isOk());

        login("thu07b", "MatKhau@1").andExpect(status().isUnauthorized());
        login("thu07b", "MoiHon@2026").andExpect(status().isOk());
    }

    @Test
    void updateGuardsCollectorAssignmentsAndAdminSelf() throws Exception {
        send(put("/api/platform/users/%d".formatted(fx.dv01Manager.getId())), """
                {"fullName":"Quản lý mới","role":"COMPANY_MANAGER","companyId":%d,"phone":"0901234567"}"""
                .formatted(fx.dv07.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Quản lý mới"))
                .andExpect(jsonPath("$.companyId").value(fx.dv07.getId()))
                .andExpect(jsonPath("$.username").value(fx.dv01Manager.getUsername()));
        // Người đi thu còn phân tổ KV07 thì không đổi công ty được; chỉ sửa tên thì được.
        send(put("/api/platform/users/%d".formatted(fx.thu07.getId())), """
                {"fullName":"Người thu 07","role":"COLLECTOR","companyId":%d}""".formatted(fx.dv07.getId()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("COLLECTOR_HAS_ASSIGNMENTS"));
        send(put("/api/platform/users/%d".formatted(fx.thu07.getId())), """
                {"fullName":"Tên mới","role":"COLLECTOR","companyId":%d}""".formatted(fx.dv01.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.fullName").value("Tên mới"));

        send(post("/api/platform/users/%d/lock".formatted(fx.admin.getId())), null)
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("CANNOT_LOCK_SELF"));
        send(put("/api/platform/users/%d".formatted(fx.admin.getId())), """
                {"fullName":"Quản trị","role":"COMMUNE_OFFICER"}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("CANNOT_CHANGE_OWN_ROLE"));
    }

    private ResultActions createCollector(String username) throws Exception {
        return send(post("/api/platform/users"), collectorBody(username));
    }

    private String collectorBody(String username) {
        return """
                {"username":"%s","fullName":"Người thu mới","role":"COLLECTOR","companyId":%d,"password":"MatKhau@1"}"""
                .formatted(username, fx.dv01.getId());
    }

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req,
            String body) throws Exception {
        req.header(HttpHeaders.AUTHORIZATION, admin);
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }

    private ResultActions login(String username, String password) throws Exception {
        return mvc.perform(post("/api/platform/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password)));
    }

    private long id(String body) {
        try {
            return json.readTree(body).get("id").asLong();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
