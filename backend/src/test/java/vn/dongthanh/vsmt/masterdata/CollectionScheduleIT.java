package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.CollectionSchedule;
import vn.dongthanh.vsmt.masterdata.domain.CollectionScheduleRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.masterdata.domain.WasteType;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
class CollectionScheduleIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    DistrictRepository districts;

    @Autowired
    CompanyRepository companies;

    @Autowired
    AreaRepository areas;

    @Autowired
    CollectionScheduleRepository schedules;

    @Autowired
    UserRepository users;

    @Autowired
    JwtService jwt;

    @Autowired
    JdbcTemplate jdbc;

    Company company;
    Area kv07;
    Area kv09;

    @BeforeEach
    void seed() {
        District dth = districts.save(District.create("DTH", "Đông Thạnh"));
        company = companies.save(Company.create("DV01", "Công ty thử", "Người liên hệ", "0900000001",
                LocalDate.of(2026, 9, 1)));
        kv07 = areas.save(Area.create("KV07", "Tổ 7", dth));
        kv09 = areas.save(Area.create("KV09", "Tổ 9", dth));

        LocalTime five = LocalTime.of(17, 0);
        LocalTime seven = LocalTime.of(19, 0);
        // Lưu lệch thứ tự để kiểm API sắp theo thứ, tuần, giờ.
        schedules.save(CollectionSchedule.create(kv07, 7, 1, LocalTime.of(8, 0), LocalTime.of(11, 0),
                WasteType.BULKY, "Chỉ hộ đã đăng ký"));
        schedules.save(CollectionSchedule.create(kv07, 6, null, five, seven, WasteType.HOUSEHOLD_RECYCLABLE, null));
        schedules.save(CollectionSchedule.create(kv07, 2, null, five, seven, WasteType.HOUSEHOLD, null));
        schedules.save(CollectionSchedule.create(kv07, 4, null, five, seven, WasteType.HOUSEHOLD, null));
        schedules.save(CollectionSchedule.create(kv09, 1, null, LocalTime.of(6, 0), LocalTime.of(8, 0),
                WasteType.HOUSEHOLD, null));
        schedules.flush();
    }

    @Test
    void returnsStructuredSchedulesOfTheRequestedAreaOnlySortedByDayAndTime() throws Exception {
        mvc.perform(get("/api/masterdata/areas/{id}/schedules", kv07.getId()).header(HttpHeaders.AUTHORIZATION,
                        token(Role.COMMUNE_OFFICER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[*].areaId").value(contains(
                        kv07.getId().intValue(), kv07.getId().intValue(), kv07.getId().intValue(),
                        kv07.getId().intValue())))
                .andExpect(jsonPath("$[*].weekday").value(contains(2, 4, 6, 7)))
                .andExpect(jsonPath("$[3].weekOfMonth").value(1))
                .andExpect(jsonPath("$[0].weekOfMonth").value(nullValue()))
                .andExpect(jsonPath("$[0].startTime").value("17:00:00"))
                .andExpect(jsonPath("$[0].endTime").value("19:00:00"))
                .andExpect(jsonPath("$[*].wasteType").value(contains(
                        "HOUSEHOLD", "HOUSEHOLD", "HOUSEHOLD_RECYCLABLE", "BULKY")))
                .andExpect(jsonPath("$[3].note").value("Chỉ hộ đã đăng ký"))
                .andExpect(jsonPath("$[0].createdAt").doesNotExist());
    }

    @Test
    void companyAndCollectorCanReadSchedules() throws Exception {
        for (Role role : new Role[] {Role.COMPANY_MANAGER, Role.COLLECTOR, Role.ADMIN}) {
            mvc.perform(get("/api/masterdata/areas/{id}/schedules", kv09.getId())
                            .header(HttpHeaders.AUTHORIZATION, token(role)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[*].weekday").value(contains(1)));
        }
    }

    @Test
    void unknownAreaReturns404() throws Exception {
        mvc.perform(get("/api/masterdata/areas/{id}/schedules", 999_999L)
                        .header(HttpHeaders.AUTHORIZATION, token(Role.COMMUNE_OFFICER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AREA_NOT_FOUND"));
    }

    @Test
    void requiresLogin() throws Exception {
        mvc.perform(get("/api/masterdata/areas/{id}/schedules", kv07.getId())).andExpect(status().isUnauthorized());
    }

    @Test
    void databaseRejectsEndTimeNotAfterStartTime() {
        assertThatThrownBy(() -> jdbc.update("""
                insert into collection_schedules (area_id, weekday, start_time, end_time, waste_type)
                values (?, 3, '19:00', '17:00', 'HOUSEHOLD')""", kv07.getId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_collection_schedules_time");
    }

    @Test
    void databaseRejectsWeekdayOutsideIsoRange() {
        assertThatThrownBy(() -> jdbc.update("""
                insert into collection_schedules (area_id, weekday, start_time, end_time, waste_type)
                values (?, 8, '17:00', '19:00', 'HOUSEHOLD')""", kv07.getId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_collection_schedules_weekday");
    }

    @Test
    void databaseRejectsUnknownWasteType() {
        assertThatThrownBy(() -> jdbc.update("""
                insert into collection_schedules (area_id, weekday, start_time, end_time, waste_type)
                values (?, 3, '17:00', '19:00', 'GLASS')""", kv07.getId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_collection_schedules_waste_type");
    }

    private String token(Role role) {
        String username = "u_" + role.name().toLowerCase();
        Long companyId = role.belongsToCompany() ? company.getId() : null;
        User user = users.save(User.create(username, "Người thử", role, companyId, "x"));
        return "Bearer " + jwt.issue(user).value();
    }
}
