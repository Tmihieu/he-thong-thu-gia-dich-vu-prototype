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

/** BR-PLT-08 / UC-04: quản lý công ty chỉ xem người đi thu của công ty mình, không ghi được. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class CollectorAccountIT extends IntegrationTest {

    static final String BASE = "/api/platform/collector-accounts";

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
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
    void listShowsOnlyOwnCompanyCollectors() throws Exception {
        mvc.perform(get(BASE).header(HttpHeaders.AUTHORIZATION, manager))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.username == 'thu_dv07')]").isEmpty())
                .andExpect(jsonPath("$[?(@.role != 'COLLECTOR')]").isEmpty());
    }

    @Test
    void otherRolesAreForbiddenToList() throws Exception {
        for (User who : new User[] {fx.officer, fx.thu07, fx.admin}) {
            mvc.perform(get(BASE).header(HttpHeaders.AUTHORIZATION, fx.bearer(who))).andExpect(status().isForbidden());
        }
    }

    /** UC-04: công ty chỉ xem; tạo / sửa / khóa / đặt lại mật khẩu là việc của quản trị (xem UserAdminIT). */
    @Test
    void managerCannotWriteCollectorAccounts() throws Exception {
        send(post("/api/platform/users"), manager, """
                {"username":"thu_moi","fullName":"A","role":"COLLECTOR","companyId":%d,"password":"MatKhau@1"}"""
                .formatted(fx.dv01.getId())).andExpect(status().isForbidden());
        long id = fx.thu09.getId();
        send(put("/api/platform/users/" + id), manager, "{\"fullName\":\"X\",\"role\":\"COLLECTOR\"}")
                .andExpect(status().isForbidden());
        send(post("/api/platform/users/" + id + "/lock"), manager, null).andExpect(status().isForbidden());
        send(post("/api/platform/users/" + id + "/password"), manager, "{\"password\":\"MoiHon@2026\"}")
                .andExpect(status().isForbidden());
        // Đường cũ của công ty đã bỏ: không còn ghi được.
        send(post(BASE), manager, "{\"username\":\"x\",\"fullName\":\"A\",\"password\":\"MatKhau@1\"}")
                .andExpect(status().is4xxClientError());
        assertThat(users.findById(id).orElseThrow().getStatus().name()).isEqualTo("ACTIVE");
    }

    private ResultActions send(MockHttpServletRequestBuilder req, String token, String body) throws Exception {
        req.header(HttpHeaders.AUTHORIZATION, token);
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }
}
