package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignment;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignmentRepository;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersionRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
@Import(FixedClockConfig.class)
class SubjectApiIT extends IntegrationTest {

    @Autowired
    TariffVersionRepository tariffs;

    @Autowired
    CollectionPeriodRepository periods;

    @Autowired
    MockMvc mvc;

    @Autowired
    DistrictRepository districts;

    @Autowired
    AreaRepository areas;

    @Autowired
    CompanyRepository companies;

    @Autowired
    AreaAssignmentRepository assignments;

    @Autowired
    UserRepository users;

    @Autowired
    JwtService jwt;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ObjectMapper json;

    Area kv07;
    Area kv17;
    Company dv01;
    String officer;

    @BeforeEach
    void seed() {
        District dth = districts.save(District.create("DTH", "Đông Thạnh"));
        District nb = districts.save(District.create("NB", "Nhị Bình"));
        kv07 = areas.save(Area.create("KV07", "Tổ dân phố 07", dth));
        kv17 = areas.save(Area.create("KV17", "Tổ dân phố 17", nb));
        dv01 = companies.save(Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1)));
        assignments.save(AreaAssignment.create(kv07, dv01, LocalDate.of(2026, 1, 1), null, null));
        officer = token("canbo_it", Role.COMMUNE_OFFICER, null);
    }

    @Test
    void createViewUpdateAndEndSubjectWithContract() throws Exception {
        JsonNode created = body(create(officer, kv07.getId(), """
                ,"contract":{"tariffGroup":"HH_3_PLUS","validFrom":"2026-01-01","exempt":false}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("DTH-H000001"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.districtCode").value("DTH"))
                .andExpect(jsonPath("$.currentContract.contractNo").value("ĐK-DTH-0001"))
                .andExpect(jsonPath("$.currentContract.tariffGroup").value("HH_3_PLUS")));
        long id = created.get("id").asLong();

        mvc.perform(put("/api/masterdata/subjects/" + id).header(HttpHeaders.AUTHORIZATION, officer)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"type":"HOUSEHOLD","name":"Trần Thị Mẫu","houseNo":"Số 20","street":"đường Mẫu","areaId":%d,
                         "phone":"0902999001","memberCount":2}""".formatted(kv07.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Trần Thị Mẫu"))
                .andExpect(jsonPath("$.code").value("DTH-H000001"));

        mvc.perform(post("/api/masterdata/subjects/" + id + "/end").header(HttpHeaders.AUTHORIZATION, officer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"endDate\":\"2026-09-30\",\"reason\":\"Chuyển đi\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ENDED"))
                .andExpect(jsonPath("$.contracts[0].validTo").value("2026-09-30"));

        mvc.perform(get("/api/masterdata/subjects/" + id).header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value("Số 20 đường Mẫu"))
                .andExpect(jsonPath("$.street").value("đường Mẫu"));
        assertThat(jdbc.queryForList("select action from audit_logs where entity_id in ('DTH-H000001', 'ĐK-DTH-0001')"
                + " order by id", String.class)).containsExactly("CREATE_SUBJECT", "CREATE_CONTRACT", "UPDATE_SUBJECT",
                "UPDATE_CONTRACT", "END_SUBJECT");
    }

    @Test
    void resumeStoppedSubjectKeepsGapAndRestoresPreviousTariffAndExemption() throws Exception {
        long id = body(create(officer, kv07.getId(), """
                ,"contract":{"tariffGroup":"HH_3_PLUS","validFrom":"2026-01-01", "exempt":true,
                "exemptReason":"Hộ nghèo"}""")).get("id").asLong();
        mvc.perform(post("/api/masterdata/subjects/" + id + "/end").header(HttpHeaders.AUTHORIZATION, officer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"endDate\":\"2026-09-15\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ENDED"));
        mvc.perform(post("/api/masterdata/subjects/" + id + "/resume").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.currentContract.validFrom").value("2026-10-01"))
                .andExpect(jsonPath("$.currentContract.exempt").value(true))
                .andExpect(jsonPath("$.currentContract.exemptReason").value("Hộ nghèo"))
                .andExpect(jsonPath("$.contracts.length()").value(2));
        assertThat(jdbc.queryForList("select action from audit_logs where entity_id = 'DTH-H000001' order by id", String.class))
                .contains("END_SUBJECT", "RESUME_SUBJECT");
    }

    @Test
    void upcomingContractIsCurrentSoFormEditsItInsteadOfAddingOverlap() throws Exception {
        create(officer, kv07.getId(), """
                ,"contract":{"tariffGroup":"HH_3_PLUS","validFrom":"2099-01-01"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.currentContract.validFrom").value("2099-01-01"));
    }

    @Test
    void changingMemberCountSwitchesTariffGroupFromNextPeriodAndKeepsHistory() throws Exception {
        // Hôm nay 01/10/2026, đang có kỳ tháng 10 (đến 31/10): nhóm giá mới phải bắt đầu từ 01/11/2026.
        TariffVersion bg = tariffs.save(TariffVersion.create("BG-IT", "QĐ thử", LocalDate.of(2026, 9, 1), null, TariffStatus.ACTIVE));
        periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg));
        long id = body(create(officer, kv07.getId(), """
                ,"contract":{"tariffGroup":"HH_3_PLUS","validFrom":"2026-01-01"}""")).get("id").asLong();

        // 4 -> 2 người: hợp đồng ≥3 kết thúc 31/10, hợp đồng ≤2 nối tiếp từ 01/11; kỳ này vẫn thu theo nhóm cũ.
        update(id, 2, "Nguyễn Văn Mẫu").andExpect(status().isOk())
                .andExpect(jsonPath("$.currentContract.tariffGroup").value("HH_3_PLUS"))
                .andExpect(jsonPath("$.currentContract.validTo").value("2026-10-31"))
                .andExpect(jsonPath("$.contracts.length()").value(2))
                .andExpect(jsonPath("$.contracts[0].tariffGroup").value("HH_UP_TO_2"))
                .andExpect(jsonPath("$.contracts[0].validFrom").value("2026-11-01"));
        // 2 -> 3 người trước khi sang kỳ sau: hợp đồng nối tiếp đổi tại chỗ về ≥3, không sinh thêm hợp đồng.
        update(id, 3, "Nguyễn Văn Mẫu").andExpect(status().isOk())
                .andExpect(jsonPath("$.contracts.length()").value(2))
                .andExpect(jsonPath("$.contracts[0].tariffGroup").value("HH_3_PLUS"));
        // Sửa tên không đổi số người thì không thêm dòng lịch sử.
        update(id, 3, "Tên khác").andExpect(status().isOk());

        mvc.perform(get("/api/masterdata/subjects/" + id + "/member-history").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].from").value(2)).andExpect(jsonPath("$[0].to").value(3))
                .andExpect(jsonPath("$[1].from").value(4)).andExpect(jsonPath("$[1].to").value(2))
                .andExpect(jsonPath("$[2].from").doesNotExist()).andExpect(jsonPath("$[2].to").value(4))
                .andExpect(jsonPath("$[0].by").value("canbo_it"));
    }

    @Test
    void overlappingContractIs422AndDatabaseAlsoRejectsIt() throws Exception {
        long id = body(create(officer, kv07.getId(), """
                ,"contract":{"tariffGroup":"HH_3_PLUS","validFrom":"2026-01-01"}""")).get("id").asLong();

        mvc.perform(post("/api/masterdata/subjects/" + id + "/contracts").header(HttpHeaders.AUTHORIZATION, officer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"tariffGroup\":\"HH_UP_TO_2\",\"validFrom\":\"2026-06-01\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CONTRACT_OVERLAP"));

        assertThatThrownBy(() -> jdbc.update("""
                insert into service_contracts (contract_no, subject_id, tariff_group, valid_from)
                values ('ĐK-X-1', ?, 'HH_3_PLUS', '2026-03-01')""", id))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ex_service_contracts_overlap");
    }

    @Test
    void searchFiltersAndCompanySeesOnlyAssignedAreas() throws Exception {
        create(officer, kv07.getId(), "").andExpect(status().isCreated());
        create(officer, kv17.getId(), "").andExpect(status().isCreated());

        mvc.perform(get("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[*].code", contains("DTH-H000001", "NB-H000001")))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"));
        mvc.perform(get("/api/masterdata/subjects").param("q", "nb-h").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$.items[*].code", contains("NB-H000001")));
        mvc.perform(get("/api/masterdata/subjects").param("areaId", kv07.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$.total").value(1));

        String company = token("dv01_it", Role.COMPANY_MANAGER, dv01.getId());
        JsonNode page = body(mvc.perform(get("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, company))
                .andExpect(jsonPath("$.items[*].code", contains("DTH-H000001"))));
        long nbId = jdbc.queryForObject("select id from service_subjects where code = 'NB-H000001'", Long.class);
        mvc.perform(get("/api/masterdata/subjects/" + nbId).header(HttpHeaders.AUTHORIZATION, company))
                .andExpect(status().isNotFound());
        assertThat(page.get("total").asLong()).isEqualTo(1);
    }

    @Test
    void onlyCommuneOfficerWritesAndInputIsValidated() throws Exception {
        create(token("admin_it", Role.ADMIN, null), kv07.getId(), "").andExpect(status().isForbidden());
        mvc.perform(post("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, officer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"HOUSEHOLD\",\"name\":\"\",\"phone\":\"abc\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        create(officer, kv07.getId(), """
                ,"contract":{"tariffGroup":"HH_3_PLUS","validFrom":"2026-01-01","exempt":true}""")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("EXEMPT_REASON_REQUIRED"));
        create(officer, kv07.getId(), """
                ,"contract":{"tariffGroup":"HH_UP_TO_2","validFrom":"2026-01-01"}""")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TARIFF_GROUP_MISMATCH"));
        mvc.perform(get("/api/masterdata/subjects").param("size", "999").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isBadRequest());
    }

    @Test
    void areaListIncludesSubjectCount() throws Exception {
        create(officer, kv07.getId(), "");
        create(officer, kv07.getId(), "");

        mvc.perform(get("/api/masterdata/areas").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$[?(@.code == 'KV07')].subjectCount").value(contains(2)))
                .andExpect(jsonPath("$[?(@.code == 'KV17')].subjectCount").value(contains(0)));
    }

    private ResultActions update(long id, int members, String name) throws Exception {
        return mvc.perform(put("/api/masterdata/subjects/" + id).header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content("""
                {"type":"HOUSEHOLD","name":"%s","houseNo":"Số 12","street":"đường Mẫu","areaId":%d,"memberCount":%d}"""
                        .formatted(name, kv07.getId(), members)));
    }

    private ResultActions create(String token, Long areaId, String extra) throws Exception {
        String bodyJson = """
                {"type":"HOUSEHOLD","name":"Nguyễn Văn Mẫu","houseNo":"Số 12","street":"đường Mẫu","areaId":%d,"memberCount":4%s}"""
                .formatted(areaId, extra);
        return mvc.perform(post("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content(bodyJson));
    }

    private JsonNode body(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    private String token(String username, Role role, Long companyId) {
        User user = users.findByUsername(username)
                .orElseGet(() -> users.save(User.create(username, username, role, companyId, "x")));
        return "Bearer " + jwt.issue(user).value();
    }
}
