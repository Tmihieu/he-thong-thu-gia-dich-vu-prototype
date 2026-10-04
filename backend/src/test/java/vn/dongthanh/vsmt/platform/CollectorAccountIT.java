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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** BR-PLT-08: quản lý công ty tạo / sửa / khóa / đặt lại mật khẩu người đi thu của chính công ty mình, không hơn. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class CollectorAccountIT extends IntegrationTest {

    static final String BASE = "/api/platform/collector-accounts";

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;

    String manager;
    User otherCompanyCollector;

    @BeforeEach
    void seed() {
        cleaner.truncateAll();
        fx.build();
        manager = fx.bearer(fx.dv01Manager);
        otherCompanyCollector = users.save(User.create("thu_dv07", "Người thu DV07", Role.COLLECTOR, fx.dv07.getId(), "x"));
    }

    @Test
    void managerCreatesCollectorOfOwnCompanyWhoCanLogIn() throws Exception {
        send(post(BASE), manager, """
                {"username":"Thu07B","fullName":"Người thu mới","phone":"0901234567","password":"MatKhau@1"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("thu07b"))
                .andExpect(jsonPath("$.role").value("COLLECTOR"))
                .andExpect(jsonPath("$.companyId").value(fx.dv01.getId()))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        login("thu07b", "MatKhau@1").andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("COLLECTOR"));

        String after = jdbc.queryForObject("select after_data::text from audit_logs where action = 'CREATE_USER'",
                String.class);
        assertThat(after).contains("thu07b").doesNotContain("MatKhau").doesNotContain("$2a$");
        String actor = jdbc.queryForObject("select actor_username from audit_logs where action = 'CREATE_USER'", String.class);
        assertThat(actor).isEqualTo(fx.dv01Manager.getUsername());
    }

    @Test
    void roleAndCompanyInBodyAreIgnored() throws Exception {
        send(post(BASE), manager, """
                {"username":"gianlan","fullName":"A","role":"ADMIN","companyId":%d,"password":"MatKhau@1"}"""
                .formatted(fx.dv07.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("COLLECTOR"))
                .andExpect(jsonPath("$.companyId").value(fx.dv01.getId()));
    }

    @Test
    void listShowsOnlyOwnCompanyCollectors() throws Exception {
        mvc.perform(get(BASE).header(HttpHeaders.AUTHORIZATION, manager))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.username == 'thu_dv07')]").isEmpty())
                .andExpect(jsonPath("$[?(@.role != 'COLLECTOR')]").isEmpty());
    }

    @Test
    void otherRolesAreForbidden() throws Exception {
        for (User who : new User[] {fx.officer, fx.thu07, fx.admin}) {
            String token = fx.bearer(who);
            mvc.perform(get(BASE).header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().isForbidden());
            send(post(BASE), token, """
                    {"username":"x_%s","fullName":"A","password":"MatKhau@1"}""".formatted(who.getUsername()))
                    .andExpect(status().isForbidden());
        }
        // Quản lý công ty vẫn không đụng được API quản trị chung.
        mvc.perform(get("/api/platform/users").header(HttpHeaders.AUTHORIZATION, manager)).andExpect(status().isForbidden());
    }

    @Test
    void managerCannotTouchOtherCompanyOrNonCollectorAccounts() throws Exception {
        String body = "{\"fullName\":\"Đổi tên\"}";
        long[] ids = {otherCompanyCollector.getId(), fx.dv07Manager.getId(), fx.dv01Manager.getId(), fx.admin.getId()};
        for (long id : ids) {
            send(put(BASE + "/" + id), manager, body).andExpect(status().isNotFound());
            send(post(BASE + "/" + id + "/lock"), manager, null).andExpect(status().isNotFound());
            send(post(BASE + "/" + id + "/unlock"), manager, null).andExpect(status().isNotFound());
            send(post(BASE + "/" + id + "/password"), manager, "{\"password\":\"MoiHon@2026\"}")
                    .andExpect(status().isNotFound());
        }
        assertThat(users.findById(otherCompanyCollector.getId()).orElseThrow().getFullName()).isEqualTo("Người thu DV07");
    }

    @Test
    void managerEditsLocksAndResetsPasswordOfOwnCollector() throws Exception {
        long id = fx.thu09.getId();
        send(put(BASE + "/" + id), manager, "{\"fullName\":\"Tên mới\",\"phone\":\"0912345678\",\"email\":\"a@b.vn\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Tên mới"))
                .andExpect(jsonPath("$.phone").value("0912345678"))
                .andExpect(jsonPath("$.role").value("COLLECTOR"))
                .andExpect(jsonPath("$.companyId").value(fx.dv01.getId()));

        send(post(BASE + "/" + id + "/lock"), manager, null).andExpect(jsonPath("$.status").value("LOCKED"));
        send(post(BASE + "/" + id + "/unlock"), manager, null).andExpect(jsonPath("$.status").value("ACTIVE"));

        send(post(BASE + "/" + id + "/password"), manager, "{\"password\":\"MoiHon@2026\"}").andExpect(status().isOk());
        login(fx.thu09.getUsername(), "MoiHon@2026").andExpect(status().isOk());

        assertThat(jdbc.queryForList("select action from audit_logs order by id", String.class))
                .contains("UPDATE_USER", "LOCK_USER", "UNLOCK_USER", "RESET_PASSWORD");
    }

    @Test
    void validatesUsernamePasswordAndDuplicates() throws Exception {
        send(post(BASE), manager, """
                {"username":"Có dấu","fullName":"A","password":"MatKhau@1"}""").andExpect(status().isBadRequest());
        send(post(BASE), manager, """
                {"username":"ngan","fullName":"A","password":"1234567"}""").andExpect(status().isBadRequest());
        send(post(BASE), manager, """
                {"username":"%s","fullName":"A","password":"MatKhau@1"}""".formatted(fx.thu07.getUsername().toUpperCase()))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
        send(post(BASE), manager, """
                {"username":"dai","fullName":"A","password":"%s"}""".formatted("ậ".repeat(30)))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PASSWORD_TOO_LONG"));
    }

    private ResultActions send(MockHttpServletRequestBuilder req, String token, String body) throws Exception {
        req.header(HttpHeaders.AUTHORIZATION, token);
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }

    private ResultActions login(String username, String password) throws Exception {
        return mvc.perform(post("/api/platform/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password)));
    }
}
