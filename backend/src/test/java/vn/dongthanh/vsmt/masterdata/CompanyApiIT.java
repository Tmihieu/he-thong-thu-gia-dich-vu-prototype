package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
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

import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Màn Công ty: cán bộ xã thêm / sửa công ty; công ty tạm ngưng không nhận phân công khu vực. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class CompanyApiIT extends IntegrationTest {

    static final String BODY = """
            {"name":"HTX Mới","contactName":"Người Mẫu C","contactPhone":"0900000099","validFrom":"2026-10-01",
             "validTo":%s,"status":%s,"orgType":"COOPERATIVE","taxCode":""}""";

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired JdbcTemplate jdbc;

    String officer;

    @BeforeEach
    void seed() {
        cleaner.truncateAll();
        fx.build();
        officer = fx.bearer(fx.officer);
    }

    @Test
    void officerCreatesWithNextCodeThenEdits() throws Exception {
        // Fixture có DV01, DV07: mã tiếp theo là DV08.
        long id = Long.parseLong(send(post("/api/masterdata/companies"), officer, BODY.formatted("null", "null"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("DV08"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.taxCode").isEmpty())
                .andReturn().getResponse().getContentAsString().replaceAll(".*\"id\":(\\d+).*", "$1"));

        send(put("/api/masterdata/companies/" + id), officer, BODY.formatted("\"2026-12-31\"", "\"INACTIVE\""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("DV08"))
                .andExpect(jsonPath("$.status").value("INACTIVE"))
                .andExpect(jsonPath("$.validTo").value("2026-12-31"));

        assertThat(jdbc.queryForList("select action from audit_logs where entity_type = 'Company' order by id",
                String.class)).containsExactly("CREATE_COMPANY", "UPDATE_COMPANY");
    }

    @Test
    void rejectsBadInputAndOtherRoles() throws Exception {
        send(post("/api/masterdata/companies"), officer, BODY.formatted("\"2026-09-30\"", "null"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("COMPANY_VALIDITY"));
        send(post("/api/masterdata/companies"), officer, BODY.formatted("null", "null").replace("0900000099", "09-abc"))
                .andExpect(status().isBadRequest());
        send(post("/api/masterdata/companies"), fx.bearer(fx.dv01Manager), BODY.formatted("null", "null"))
                .andExpect(status().isForbidden());
        send(put("/api/masterdata/companies/" + fx.dv01.getId()), fx.bearer(fx.admin), BODY.formatted("null", "null"))
                .andExpect(status().isForbidden());
    }

    @Test
    void inactiveCompanyCannotTakeAreas() throws Exception {
        send(put("/api/masterdata/companies/" + fx.dv07.getId()), officer, BODY.formatted("null", "\"INACTIVE\""))
                .andExpect(status().isOk());

        // Sửa mà không gửi trạng thái thì giữ Tạm ngưng.
        send(put("/api/masterdata/companies/" + fx.dv07.getId()), officer, BODY.formatted("null", "null"))
                .andExpect(jsonPath("$.status").value("INACTIVE"));

        send(post("/api/masterdata/area-assignments"), officer,
                "{\"areaIds\":[%d],\"companyId\":%d,\"fromDate\":\"2026-11-01\"}".formatted(fx.kv07.getId(), fx.dv07.getId()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("COMPANY_INACTIVE"));
    }

    private ResultActions send(MockHttpServletRequestBuilder req, String bearer, String body) throws Exception {
        return mvc.perform(req.header(HttpHeaders.AUTHORIZATION, bearer).contentType(MediaType.APPLICATION_JSON).content(body));
    }
}
