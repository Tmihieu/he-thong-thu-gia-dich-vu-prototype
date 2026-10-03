package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
class LocationApiIT extends IntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired DistrictRepository districts;
    @Autowired AreaRepository areas;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    District district;
    Area area;
    String admin;

    @BeforeEach
    void seed() {
        district = districts.save(District.create("LOC", "Địa bàn cũ"));
        area = areas.save(Area.create("LOC01", "Tổ cũ", district));
        admin = token(Role.ADMIN);
    }

    @Test
    void updatesNamesAndStatusWithoutChangingCodesAndRecordsAudit() throws Exception {
        mvc.perform(put("/api/masterdata/districts/" + district.getId())
                .header(HttpHeaders.AUTHORIZATION, admin).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":" Địa bàn mới ","note":"Ghi chú","sortOrder":2}
                        """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Địa bàn mới"))
                .andExpect(jsonPath("$.code").value("LOC"));
        mvc.perform(put("/api/masterdata/areas/" + area.getId())
                .header(HttpHeaders.AUTHORIZATION, admin).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Tổ mới","status":"INACTIVE"}
                        """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("INACTIVE"))
                .andExpect(jsonPath("$.districtCode").value("LOC"))
                .andExpect(jsonPath("$.code").value("LOC01"));
        assertThat(jdbc.queryForList("select action from audit_logs where entity_type in ('District', 'Area') order by id",
                String.class)).containsExactly("UPDATE_DISTRICT", "UPDATE_AREA");
    }

    @Test
    void rejectsInvalidInputMissingRecordsAndNonAdminWrites() throws Exception {
        String body = "{\"name\":\"Tên mới\",\"status\":\"ACTIVE\"}";
        mvc.perform(put("/api/masterdata/areas/" + area.getId())
                .header(HttpHeaders.AUTHORIZATION, token(Role.COMMUNE_OFFICER))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(put("/api/masterdata/districts/" + district.getId())
                .header(HttpHeaders.AUTHORIZATION, token(Role.LEADER))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(put("/api/masterdata/areas/" + area.getId())
                .header(HttpHeaders.AUTHORIZATION, admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\" \"}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/masterdata/districts/" + district.getId())
                .header(HttpHeaders.AUTHORIZATION, admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Tên\",\"sortOrder\":-1}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/masterdata/areas/99999999")
                .header(HttpHeaders.AUTHORIZATION, admin).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isNotFound());
    }

    private String token(Role role) {
        User user = users.save(User.create("location_" + role.name().toLowerCase(), "Người dùng", role, null, "x"));
        return "Bearer " + jwt.issue(user).value();
    }
}
