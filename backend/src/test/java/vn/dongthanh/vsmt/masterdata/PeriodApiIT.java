package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersionRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
class PeriodApiIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    CompanyRepository companies;

    @Autowired
    TariffVersionRepository tariffs;

    @Autowired
    JwtService jwt;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ObjectMapper json;

    String admin;
    String officer;
    String company;

    @BeforeEach
    void seed() {
        TariffVersion bg = TariffVersion.create("BG-IT-2026", "QĐ thử", LocalDate.of(2026, 9, 1),
                LocalDate.of(2027, 6, 30), TariffStatus.ACTIVE);
        bg.addRate(TariffGroup.HH_3_PLUS, 57_000, 23_000, "đ/hộ/tháng");
        tariffs.save(bg);
        Company dv = companies.save(Company.create("DV01", "Công ty Mẫu", "Người Mẫu", "0900000001",
                LocalDate.of(2026, 1, 1)));
        admin = token("admin_it", Role.ADMIN, null);
        officer = token("canbo_it", Role.COMMUNE_OFFICER, null);
        company = token("dv01_it", Role.COMPANY_MANAGER, dv.getId());
    }

    @Test
    void adminOpensMonthPeriodWithTariffAndAudit() throws Exception {
        open(admin, "MONTH", 10, "2026-10-31")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("2026-10"))
                .andExpect(jsonPath("$.label").value("Tháng 10/2026"))
                .andExpect(jsonPath("$.startDate").value("2026-10-01"))
                .andExpect(jsonPath("$.openDate").value("2026-10-01"))
                .andExpect(jsonPath("$.tariffVersionCode").value("BG-IT-2026"))
                .andExpect(jsonPath("$.status").value("OPEN"));

        assertThat(jdbc.queryForObject("select actor_username from audit_logs"
                + " where action = 'OPEN_PERIOD' and entity_id = '2026-10'", String.class)).isEqualTo("admin_it");
    }

    @Test
    void communeOfficerAndCompanyCannotOpenOrStartPeriods() throws Exception {
        open(officer, "MONTH", 10, "2026-10-31")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        open(company, "QUARTER", 4, "2026-12-31").andExpect(status().isForbidden());

        long id = idOf(open(admin, "MONTH", 11, "2026-11-30"));
        mvc.perform(post("/api/masterdata/periods/" + id + "/start").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isForbidden());
    }

    @Test
    void openingTheSamePeriodTwiceReturns409() throws Exception {
        open(admin, "MONTH", 10, "2026-10-31").andExpect(status().isCreated());
        open(admin, "MONTH", 10, "2026-11-15")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PERIOD_ALREADY_EXISTS"));
    }

    @Test
    void startCollectingThenStartingAgainIs422() throws Exception {
        long id = idOf(open(admin, "QUARTER", 4, "2026-12-31"));

        mvc.perform(post("/api/masterdata/periods/" + id + "/start").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COLLECTING"))
                .andExpect(jsonPath("$.tariffVersionCode").value("BG-IT-2026"));
        mvc.perform(post("/api/masterdata/periods/" + id + "/start").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_INVALID_TRANSITION"));
    }

    @Test
    void everyInternalRoleListsPeriodsAndCanFilterByDate() throws Exception {
        open(admin, "MONTH", 10, "2026-10-31");
        open(admin, "QUARTER", 4, "2026-12-31");
        open(admin, "MONTH", 12, "2026-12-31");

        mvc.perform(get("/api/masterdata/periods").header(HttpHeaders.AUTHORIZATION, company))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", contains("2026-12", "2026-10", "2026-Q4")));
        mvc.perform(get("/api/masterdata/periods").param("date", "2026-10-15").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$[*].code", contains("2026-10", "2026-Q4")));
    }

    @Test
    void invalidInputAndMissingTariffAreRejected() throws Exception {
        mvc.perform(post("/api/masterdata/periods").header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"MONTH\",\"year\":2026,\"number\":10}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mvc.perform(post("/api/masterdata/periods").header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"MONTH\",\"year\":2030,\"number\":1,\"dueDate\":\"2030-01-31\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TARIFF_NOT_FOUND"));
    }

    private ResultActions open(String token, String type, int number, String dueDate) throws Exception {
        String body = "{\"type\":\"%s\",\"year\":2026,\"number\":%d,\"dueDate\":\"%s\"}".formatted(type, number, dueDate);
        return mvc.perform(post("/api/masterdata/periods").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private long idOf(ResultActions result) throws Exception {
        JsonNode node = json.readTree(result.andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString());
        return node.get("id").asLong();
    }

    private String token(String username, Role role, Long companyId) {
        User user = users.save(User.create(username, username, role, companyId, "x"));
        return "Bearer " + jwt.issue(user).value();
    }
}
