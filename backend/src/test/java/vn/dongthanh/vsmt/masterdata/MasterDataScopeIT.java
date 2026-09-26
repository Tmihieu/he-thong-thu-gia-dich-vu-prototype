package vn.dongthanh.vsmt.masterdata;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Phạm vi dữ liệu công ty (SPEC §9.2): công ty A không đọc được công ty B. Chạy trong transaction, rollback sau mỗi test. */
@Transactional
class MasterDataScopeIT extends IntegrationTest {

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

    Company dv01;
    Company dv02;
    District dth;

    @BeforeEach
    void seed() {
        dth = districts.save(District.create("DTH", "Đông Thạnh"));
        District nb = districts.save(District.create("NB", "Nhị Bình"));
        areas.save(Area.create("KV01", "Tổ dân phố 01", dth));
        areas.save(Area.create("KV17", "Tổ dân phố 17", nb));
        dv01 = companies.save(Company.create("DV01", "Công ty Mẫu Một", "Người Mẫu A", "0900000001",
                LocalDate.of(2026, 1, 1)));
        dv02 = companies.save(Company.create("DV02", "Công ty Mẫu Hai", "Người Mẫu B", "0900000002",
                LocalDate.of(2026, 1, 1)));
    }

    @Test
    void companyManagerCannotReadAnotherCompany() throws Exception {
        String token = token("dv01", Role.COMPANY_MANAGER, dv01.getId());

        mvc.perform(get("/api/masterdata/companies/" + dv02.getId()).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));

        mvc.perform(get("/api/masterdata/companies/" + dv01.getId()).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("DV01"))
                .andExpect(jsonPath("$.contactPhone").value("0900000001"));
    }

    @Test
    void companyListOfCompanyRolesContainsOnlyTheirOwnCompany() throws Exception {
        mvc.perform(get("/api/masterdata/companies").header(HttpHeaders.AUTHORIZATION,
                        token("dv02", Role.COMPANY_MANAGER, dv02.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", contains("DV02")));

        mvc.perform(get("/api/masterdata/companies").header(HttpHeaders.AUTHORIZATION,
                        token("thu_dv01", Role.COLLECTOR, dv01.getId())))
                .andExpect(jsonPath("$[*].code", contains("DV01")));

        mvc.perform(get("/api/masterdata/companies/" + dv02.getId()).header(HttpHeaders.AUTHORIZATION,
                        token("thu_dv01", Role.COLLECTOR, dv01.getId())))
                .andExpect(status().isNotFound());
    }

    @Test
    void communeOfficerAndAdminReadEverything() throws Exception {
        for (String token : new String[] {
                token("canbo_xa", Role.COMMUNE_OFFICER, null), token("admin", Role.ADMIN, null)}) {
            mvc.perform(get("/api/masterdata/companies").header(HttpHeaders.AUTHORIZATION, token))
                    .andExpect(jsonPath("$[*].code", contains("DV01", "DV02")));
            mvc.perform(get("/api/masterdata/companies/" + dv02.getId()).header(HttpHeaders.AUTHORIZATION, token))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void districtsAndAreasAreReadableAndFilterable() throws Exception {
        String token = token("canbo_xa", Role.COMMUNE_OFFICER, null);

        mvc.perform(get("/api/masterdata/districts").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(jsonPath("$[*].code", contains("DTH", "NB")));
        mvc.perform(get("/api/masterdata/areas").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(jsonPath("$[*].code", contains("KV01", "KV17")))
                .andExpect(jsonPath("$[0].districtCode").value("DTH"));
        mvc.perform(get("/api/masterdata/areas").param("districtId", dth.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].code").value("KV01"));
    }

    @Test
    void masterDataRequiresLogin() throws Exception {
        mvc.perform(get("/api/masterdata/companies")).andExpect(status().isUnauthorized());
    }

    private String token(String username, Role role, Long companyId) {
        User user = users.findByUsername(username)
                .orElseGet(() -> users.save(User.create(username, username, role, companyId, "x")));
        return "Bearer " + jwt.issue(user).value();
    }
}
