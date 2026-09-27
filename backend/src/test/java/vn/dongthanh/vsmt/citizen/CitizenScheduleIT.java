package vn.dongthanh.vsmt.citizen;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.masterdata.domain.CollectionSchedule;
import vn.dongthanh.vsmt.masterdata.domain.CollectionScheduleRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.WasteType;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Hộ A ở KV07 (DV01), hộ B ở KV12 (DV07): mỗi hộ chỉ thấy lịch của tổ mình. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CitizenScheduleIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired CollectionScheduleRepository schedules;
    @Autowired JwtService jwt;

    CitizenAccount citizenA;
    CitizenAccount citizenB;

    @BeforeEach
    void setUp() {
        fx.build();
        citizenA = accounts.save(CitizenAccount.create("0902000001",
                subjects.findByCode("DTH-H000001").orElseThrow(), "Chủ hộ A"));
        citizenB = accounts.save(CitizenAccount.create("0902000005",
                subjects.findByCode("DTH-H000005").orElseThrow(), "Chủ hộ B"));
        LocalTime five = LocalTime.of(17, 0);
        LocalTime seven = LocalTime.of(19, 0);
        schedules.save(CollectionSchedule.create(fx.kv07, 4, null, five, seven, WasteType.HOUSEHOLD, null));
        schedules.save(CollectionSchedule.create(fx.kv07, 2, null, five, seven, WasteType.HOUSEHOLD, null));
        schedules.save(CollectionSchedule.create(fx.kv07, 7, 1, LocalTime.of(8, 0), LocalTime.of(11, 0),
                WasteType.BULKY, "Chỉ hộ đã đăng ký"));
        schedules.save(CollectionSchedule.create(fx.kv12, 1, null, LocalTime.of(6, 0), LocalTime.of(8, 0),
                WasteType.HOUSEHOLD_RECYCLABLE, null));
        schedules.flush();
    }

    @Test
    void returnsScheduleOfOwnAreaWithServingCompany() throws Exception {
        mvc.perform(get("/api/citizen/schedule").header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.areaCode").value("KV07"))
                .andExpect(jsonPath("$.areaName").value("Tổ 07"))
                .andExpect(jsonPath("$.districtName").value("Đông Thạnh"))
                .andExpect(jsonPath("$.company.code").value("DV01"))
                .andExpect(jsonPath("$.lines", hasSize(3)))
                .andExpect(jsonPath("$.lines[*].weekday").value(contains(2, 4, 7)))
                .andExpect(jsonPath("$.lines[2].weekOfMonth").value(1))
                .andExpect(jsonPath("$.lines[0].startTime").value("17:00:00"))
                .andExpect(jsonPath("$.lines[2].wasteType").value("BULKY"))
                .andExpect(jsonPath("$.lines[2].note").value("Chỉ hộ đã đăng ký"));

        mvc.perform(get("/api/citizen/schedule").header(HttpHeaders.AUTHORIZATION, bearer(citizenB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.areaCode").value("KV12"))
                .andExpect(jsonPath("$.company.code").value("DV07"))
                .andExpect(jsonPath("$.lines[*].wasteType").value(contains("HOUSEHOLD_RECYCLABLE")));
    }

    @Test
    void internalTokenIsRejected() throws Exception {
        mvc.perform(get("/api/citizen/schedule").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(status().isForbidden());
    }

    private String bearer(CitizenAccount a) {
        return "Bearer " + jwt.issueCitizen(a.getId(), a.getSubject().getId()).value();
    }
}
