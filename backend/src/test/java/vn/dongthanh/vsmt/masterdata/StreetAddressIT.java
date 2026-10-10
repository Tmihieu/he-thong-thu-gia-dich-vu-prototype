package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignment;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignmentRepository;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.masterdata.domain.Street;
import vn.dongthanh.vsmt.masterdata.domain.StreetRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Địa chỉ chuẩn hóa và cảnh báo nghi trùng hộ, kiểm ở backend (không chỉ ở form). */
@Transactional
class StreetAddressIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    DistrictRepository districts;
    @Autowired
    AreaRepository areas;
    @Autowired
    StreetRepository streets;
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

    @jakarta.persistence.PersistenceContext
    jakarta.persistence.EntityManager em;

    District dth;
    District nb;
    Area kv07;
    Area kv08;
    Area ap50;
    Street huDth;
    String officer;

    @BeforeEach
    void seed() {
        dth = districts.save(District.create("DTH", "Đông Thạnh"));
        nb = districts.save(District.create("NB", "Nhị Bình"));
        kv07 = areas.save(Area.create("KV07", "Tổ 07", dth));
        kv08 = areas.save(Area.create("KV08", "Tổ 08", dth));
        ap50 = areas.save(Area.create("AP50", "Ấp 50", nb));
        huDth = Street.street("Đường Nguyễn Huệ");
        huDth.setAreaIds(java.util.Set.of(kv07.getId(), kv08.getId()));
        huDth = streets.save(huDth);
        officer = token("canbo_it", Role.COMMUNE_OFFICER, null);
    }

    // ---- gợi ý đường

    @Test
    void differentSpellingsOldNamesAndAlleyFullNamesFindTheStreet() throws Exception {
        Street muc = Street.street("Đông Thạnh 8");
        muc.rename("Nguyễn Thị Mực", "NQ 380/NQ-HĐND 24/7/2025");
        muc = streets.save(muc);
        streets.save(Street.alley(muc, "Hẻm 12"));
        for (String q : new String[] { "nguyen hue", "NGUYỄN  HUỆ", "đường nguyễn huệ", "huệ" }) {
            mvc.perform(get("/api/masterdata/streets/suggest").param("q", q).header(HttpHeaders.AUTHORIZATION, officer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.streets.length()").value(1))
                    .andExpect(jsonPath("$.streets[0].id").value(huDth.getId()));
        }
        // Tên cũ vẫn tìm ra đường (và hẻm của nó); đường trước hẻm.
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "dong thanh 8").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$.streets[0].displayName").value("Nguyễn Thị Mực"));
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "hẻm 12 nguyễn thị mực").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$.streets.length()").value(1))
                .andExpect(jsonPath("$.streets[0].displayName").value("Hẻm 12 Nguyễn Thị Mực"))
                .andExpect(jsonPath("$.streets[0].kind").value("ALLEY"));
    }

    @Test
    void wildcardsInQueryAreNotTreatedAsLikePatterns() throws Exception {
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "%%").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$.streets.length()").value(0));
    }

    @Test
    void suggestIsOfficerOnlyAndOfficerCannotChangeTheCatalog() throws Exception {
        String company = token("dv01_it", Role.COMPANY_MANAGER, companies.save(
                Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1))).getId());
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "hue").header(HttpHeaders.AUTHORIZATION, company))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/masterdata/streets").header(HttpHeaders.AUTHORIZATION, company))
                .andExpect(status().isForbidden());
        // Danh mục do quản trị viên quản lý: cán bộ xã chỉ chọn.
        mvc.perform(post("/api/masterdata/streets").header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Đường Lê Lợi\",\"kind\":\"STREET\"}"))
                .andExpect(status().isForbidden());
    }

    // ---- hồ sơ hộ

    @Test
    void savedHouseholdLinksToStreetIdAndAlleyShowsWithItsStreet() throws Exception {
        create(kv07, huDth.getId(), "12A", null, "", "")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.streetId").value(huDth.getId()))
                .andExpect(jsonPath("$.street").value("Đường Nguyễn Huệ"))
                .andExpect(jsonPath("$.address").value("12A Đường Nguyễn Huệ"));
        Street alley = streets.save(Street.alley(huDth, "Hẻm 5"));
        create(kv07, alley.getId(), "5/2", null, "", "").andExpect(status().isCreated())
                .andExpect(jsonPath("$.street").value("Hẻm 5 Đường Nguyễn Huệ"))
                .andExpect(jsonPath("$.address").value("5/2 Hẻm 5 Đường Nguyễn Huệ"));
        // Đường là của cả xã: nhà giáp ranh ở ấp thuộc xã cũ khác vẫn chọn được (không còn chặn theo địa bàn).
        create(ap50, huDth.getId(), "99", null, "", "").andExpect(status().isCreated());
    }

    @Test
    void sameAddressIsSuspectedAndNeedsReasonThatIsAudited() throws Exception {
        long first = body(create(kv07, huDth.getId(), "12/5", null, "", "").andExpect(status().isCreated())).get("id").asLong();

        // Cách viết khác ("số 12 / 5") vẫn nhận ra; backend chặn khi chưa có lý do.
        create(kv07, huDth.getId(), "số 12 / 5", null, "", "")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_SUSPECTED"));
        assertThat(count()).isEqualTo(1);

        dupCheck(kv07, huDth.getId(), "12/5", null, null)
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(first))
                .andExpect(jsonPath("$[0].code").value("DTH-H000001"))
                .andExpect(jsonPath("$[0].name").value("Nguyễn Văn Mẫu"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));

        // Xác nhận là hộ khác + lý do → tạo được; nhiều hộ chung nhà nên không có unique tuyệt đối.
        create(kv07, huDth.getId(), "12/5", null, "", ",\"duplicateReason\":\"Hai hộ thuê chung nhà\"")
                .andExpect(status().isCreated());
        assertThat(count()).isEqualTo(2);
        assertThat(jdbc.queryForObject("select after_data::text from audit_logs where action = 'CREATE_SUBJECT'"
                + " and entity_id = 'DTH-H000002'", String.class)).contains("Hai hộ thuê chung nhà", "DTH-H000001");
    }

    @Test
    void differentSuffixSlashUnitAreaOrBlankHouseNumberAreNotDuplicates() throws Exception {
        create(kv07, huDth.getId(), "12/5", null, "", "").andExpect(status().isCreated());

        create(kv07, huDth.getId(), "12/5B", null, "", "").andExpect(status().isCreated());   // hậu tố khác
        create(kv07, huDth.getId(), "12", null, "", "").andExpect(status().isCreated());      // thiếu "/5"
        create(kv08, huDth.getId(), "12/5", null, "", "").andExpect(status().isCreated());    // tổ/ấp khác
        // Nhà chưa số: hai hộ trống số nhà không phải bằng chứng trùng.
        create(kv07, huDth.getId(), null, null, "", ",\"locationNote\":\"đối diện chợ\"").andExpect(status().isCreated());
        create(kv07, huDth.getId(), "", null, "", ",\"locationNote\":\"cạnh trường\"").andExpect(status().isCreated());
        assertThat(count()).isEqualTo(6);
    }

    @Test
    void unitNumberSeparatesHouseholdsSharingOneAddress() throws Exception {
        create(kv07, huDth.getId(), "30", "P101", "", "").andExpect(status().isCreated());
        create(kv07, huDth.getId(), "30", "p 102", "", "").andExpect(status().isCreated());       // phòng khác
        create(kv07, huDth.getId(), "30", "P101", "", "").andExpect(status().isConflict());      // cùng phòng
        create(kv07, huDth.getId(), "30", null, "", "").andExpect(status().isConflict());        // một bên không ghi phòng → vẫn nghi
    }

    @Test
    void endedHouseholdsAreStillMatched() throws Exception {
        long id = body(create(kv07, huDth.getId(), "7", null, "", "").andExpect(status().isCreated())).get("id").asLong();
        mvc.perform(post("/api/masterdata/subjects/" + id + "/end").header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"endDate\":\"2026-09-30\"}")).andExpect(status().isOk());

        dupCheck(kv07, huDth.getId(), "7", null, null).andExpect(jsonPath("$[0].status").value("ENDED"));
        create(kv07, huDth.getId(), "7", null, "", "").andExpect(status().isConflict());
    }

    @Test
    void editingExcludesItselfAndOnlyAsksAgainWhenAddressChanges() throws Exception {
        long a = body(create(kv07, huDth.getId(), "1", null, "", "").andExpect(status().isCreated())).get("id").asLong();
        long b = body(create(kv07, huDth.getId(), "2", null, "", "").andExpect(status().isCreated())).get("id").asLong();

        dupCheck(kv07, huDth.getId(), "1", null, a).andExpect(jsonPath("$.length()").value(0));
        // Sửa tên, giữ địa chỉ: không bị coi là trùng chính mình, mã hộ giữ nguyên.
        update(a, kv07, huDth.getId(), "1", null, ",\"phone\":\"0902111222\"")
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("DTH-H000001"));
        // Đổi sang địa chỉ của hộ khác: chặn; có lý do: cho.
        update(b, kv07, huDth.getId(), "1", null, "").andExpect(status().isConflict());
        update(b, kv07, huDth.getId(), "1", null, ",\"duplicateReason\":\"Hai hộ cùng căn\"").andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("DTH-H000002"));
        // Hộ đã đang trùng, sửa SĐT (không đổi địa chỉ) thì không bị hỏi lại.
        update(b, kv07, huDth.getId(), "1", null, ",\"phone\":\"0902333444\"").andExpect(status().isOk());
    }

    @Test
    void streetNotFoundIsRecordedAsPendingAndLegacyAddressStaysEditable() throws Exception {
        long pending = body(createRaw("""
                {"type":"HOUSEHOLD","name":"Hộ mới","houseNo":"9","street":"Hẻm Chưa Có","streetPending":true,"areaId":%d,"memberCount":3}"""
                .formatted(kv07.getId())).andExpect(status().isCreated())
                .andExpect(jsonPath("$.streetId").doesNotExist())
                .andExpect(jsonPath("$.streetPending").value(true))
                .andExpect(jsonPath("$.address").value("9 Hẻm Chưa Có"))).get("id").asLong();
        // Không tự thêm đường vào danh mục.
        assertThat(jdbc.queryForObject("select count(*) from streets where name like '%Chưa Có%'", Integer.class)).isZero();

        // Hồ sơ cũ (trước chuẩn hóa): chỉ có tên đường tự do, không streetId; vẫn xem và sửa được.
        jdbc.update("update service_subjects set street_id = null, street_pending = false, street = 'đường Mẫu',"
                + " house_no = 'Số 12', address = 'Số 12 đường Mẫu' where id = ?", pending);
        em.flush();
        em.clear();
        mvc.perform(get("/api/masterdata/subjects/" + pending).header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.streetId").doesNotExist())
                .andExpect(jsonPath("$.address").value("Số 12 đường Mẫu"));
        putRaw(pending, """
                {"type":"HOUSEHOLD","name":"Hộ mới","houseNo":"Số 12","street":"đường Mẫu","areaId":%d,"memberCount":3,"phone":"0902555666"}"""
                .formatted(kv07.getId())).andExpect(status().isOk()).andExpect(jsonPath("$.phone").value("0902555666"));
        // Thiếu cả đường chuẩn lẫn tên tạm → 422.
        createRaw("{\"type\":\"HOUSEHOLD\",\"name\":\"X\",\"areaId\":%d,\"memberCount\":2}".formatted(kv07.getId()))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("STREET_REQUIRED"));
    }

    @Test
    void duplicateCheckIsOfficerOnlySoNoHouseholdDataLeaks() throws Exception {
        create(kv07, huDth.getId(), "3", null, "", "").andExpect(status().isCreated());
        String company = token("dv01_it", Role.COMPANY_MANAGER, companies.save(
                Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1))).getId());
        mvc.perform(post("/api/masterdata/subjects/duplicate-check").header(HttpHeaders.AUTHORIZATION, company)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"areaId\":%d,\"streetId\":%d,\"houseNo\":\"3\"}".formatted(kv07.getId(), huDth.getId())))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/masterdata/subjects/duplicate-check").contentType(MediaType.APPLICATION_JSON)
                .content("{\"areaId\":1,\"streetId\":1}")).andExpect(status().isUnauthorized());
    }

    // ---- tiện ích

    private int count() {
        return jdbc.queryForObject("select count(*) from service_subjects", Integer.class);
    }

    private ResultActions create(Area area, Long streetId, String house, String unit, String street, String extra)
            throws Exception {
        return createRaw(subjectJson(area, streetId, house, unit, extra));
    }

    private ResultActions update(long id, Area area, Long streetId, String house, String unit, String extra) throws Exception {
        return putRaw(id, subjectJson(area, streetId, house, unit, extra));
    }

    private String subjectJson(Area area, Long streetId, String house, String unit, String extra) {
        return "{\"type\":\"HOUSEHOLD\",\"name\":\"Nguyễn Văn Mẫu\",\"areaId\":%d,\"streetId\":%d,\"memberCount\":4%s%s%s}".formatted(
                area.getId(), streetId, house == null ? "" : ",\"houseNo\":\"" + house + "\"",
                unit == null ? "" : ",\"unitNo\":\"" + unit + "\"", extra);
    }

    private ResultActions createRaw(String jsonBody) throws Exception {
        return mvc.perform(post("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content(jsonBody));
    }

    private ResultActions putRaw(long id, String jsonBody) throws Exception {
        return mvc.perform(put("/api/masterdata/subjects/" + id).header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content(jsonBody));
    }

    private ResultActions dupCheck(Area area, Long streetId, String house, String unit, Long exclude) throws Exception {
        String bodyJson = "{\"areaId\":%d,\"streetId\":%d%s%s%s}".formatted(area.getId(), streetId,
                house == null ? "" : ",\"houseNo\":\"" + house + "\"", unit == null ? "" : ",\"unitNo\":\"" + unit + "\"",
                exclude == null ? "" : ",\"excludeSubjectId\":" + exclude);
        return mvc.perform(post("/api/masterdata/subjects/duplicate-check").header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content(bodyJson)).andExpect(status().isOk());
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
