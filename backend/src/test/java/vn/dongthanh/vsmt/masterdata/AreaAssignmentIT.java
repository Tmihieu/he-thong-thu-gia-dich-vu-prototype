package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
class AreaAssignmentIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    DistrictRepository districts;

    @Autowired
    AreaRepository areas;

    @Autowired
    CompanyRepository companies;

    @Autowired
    UserRepository users;

    @Autowired
    JwtService jwt;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    AreaAssignmentService service;

    Area kv07;
    Area kv24;
    Company dv01;
    Company dv03;
    String officer;

    @BeforeEach
    void seed() {
        District dth = districts.save(District.create("DTH", "Đông Thạnh"));
        kv07 = areas.save(Area.create("KV07", "Tổ dân phố 07", dth));
        kv24 = areas.save(Area.create("KV24", "Tổ dân phố 24", dth));
        dv01 = companies.save(Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1)));
        dv03 = companies.save(Company.create("DV03", "Công ty Ba", "B", "0900000003", LocalDate.of(2026, 1, 1)));
        officer = token("canbo_it", Role.COMMUNE_OFFICER, null);
    }

    @Test
    void officerAssignsSeveralAreasAndHistoryIsKeptWhenCompanyChanges() throws Exception {
        assign(officer, "[%d, %d]".formatted(kv07.getId(), kv24.getId()), dv03.getId(), "2026-09-01")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$[*].areaCode", contains("KV07", "KV24")))
                .andExpect(jsonPath("$[0].companyCode").value("DV03"));

        assign(officer, "[%d]".formatted(kv07.getId()), dv01.getId(), "2026-10-15").andExpect(status().isCreated());

        mvc.perform(get("/api/masterdata/areas/" + kv07.getId() + "/assignments").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].companyCode", contains("DV01", "DV03")))
                .andExpect(jsonPath("$[0].validTo").doesNotExist())
                .andExpect(jsonPath("$[1].validTo").value("2026-10-14"));

        assertThat(service.companyOf(kv07.getId(), LocalDate.of(2026, 10, 14))).contains(dv03.getId());
        assertThat(service.companyOf(kv07.getId(), LocalDate.of(2026, 10, 15))).contains(dv01.getId());
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'ASSIGN_AREA' and entity_id = 'KV07'",
                Integer.class)).isEqualTo(2);
    }

    @Test
    void onlyCommuneOfficerMayAssign() throws Exception {
        assign(token("admin_it", Role.ADMIN, null), "[%d]".formatted(kv24.getId()), dv01.getId(), "2026-10-01")
                .andExpect(status().isForbidden());
        assign(token("dv01_it", Role.COMPANY_MANAGER, dv01.getId()), "[%d]".formatted(kv24.getId()), dv01.getId(),
                "2026-10-01").andExpect(status().isForbidden());
    }

    @Test
    void businessRuleViolationsReturn422AndInvalidInput400() throws Exception {
        assign(officer, "[%d]".formatted(kv07.getId()), dv03.getId(), "2026-09-01").andExpect(status().isCreated());

        assign(officer, "[%d]".formatted(kv07.getId()), dv01.getId(), "2026-08-01")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("ASSIGNMENT_BEFORE_CURRENT"));
        assign(officer, "[]", dv01.getId(), "2026-10-01")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void databaseRejectsOverlappingAssignmentsForTheSameArea() {
        jdbc.update("insert into area_assignments (area_id, company_id, valid_from) values (?, ?, '2026-09-01')",
                kv07.getId(), dv03.getId());

        assertThatThrownBy(() -> jdbc.update(
                "insert into area_assignments (area_id, company_id, valid_from, valid_to) values (?, ?, '2026-10-01', '2026-10-31')",
                kv07.getId(), dv01.getId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ex_area_assignments_overlap");
    }

    @Test
    void activeAssignmentsAreScopedForCompanies() throws Exception {
        assign(officer, "[%d]".formatted(kv07.getId()), dv01.getId(), "2026-09-01");
        assign(officer, "[%d]".formatted(kv24.getId()), dv03.getId(), "2026-09-01");

        mvc.perform(get("/api/masterdata/area-assignments").param("date", "2026-10-01")
                        .header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$[*].areaCode", contains("KV07", "KV24")));
        mvc.perform(get("/api/masterdata/area-assignments").param("date", "2026-10-01")
                        .header(HttpHeaders.AUTHORIZATION, token("dv01_it", Role.COMPANY_MANAGER, dv01.getId())))
                .andExpect(jsonPath("$[*].areaCode", contains("KV07")));
        mvc.perform(get("/api/masterdata/areas/" + kv07.getId() + "/assignments")
                        .header(HttpHeaders.AUTHORIZATION, token("dv03_it", Role.COMPANY_MANAGER, dv03.getId())))
                .andExpect(status().isForbidden());
    }

    private ResultActions assign(String token, String areaIds, Long companyId, String from) throws Exception {
        String body = "{\"areaIds\":%s,\"companyId\":%d,\"fromDate\":\"%s\"}".formatted(areaIds, companyId, from);
        return mvc.perform(post("/api/masterdata/area-assignments").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String token(String username, Role role, Long companyId) {
        User user = users.findByUsername(username)
                .orElseGet(() -> users.save(User.create(username, username, role, companyId, "x")));
        return "Bearer " + jwt.issue(user).value();
    }
}
