package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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
import vn.dongthanh.vsmt.masterdata.service.GoongClient;
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

    @MockitoBean
    GoongClient goong;

    District dth;
    District nb;
    Area kv07;
    Area kv08;
    Street huDth;
    Street huNb;
    String officer;

    @BeforeEach
    void seed() {
        dth = districts.save(District.create("DTH", "Đông Thạnh"));
        nb = districts.save(District.create("NB", "Nhị Bình"));
        kv07 = areas.save(Area.create("KV07", "Tổ 07", dth));
        kv08 = areas.save(Area.create("KV08", "Tổ 08", dth));
        // Hai đường trùng tên ở hai xã khác nhau.
        huDth = streets.save(Street.create(dth, "Đường Nguyễn Huệ", null));
        huNb = streets.save(Street.create(nb, "Nguyễn Huệ", null));
        officer = token("canbo_it", Role.COMMUNE_OFFICER, null);
        when(goong.autocomplete(anyString(), anyInt())).thenReturn(new GoongClient.Result(GoongClient.Status.OK, List.of()));
    }

    // ---- danh mục đường + gợi ý

    @Test
    void differentSpellingsFindTheSameStreetAndSameNameShowsDistrict() throws Exception {
        for (String q : new String[] { "nguyen hue", "NGUYỄN  HUỆ", "đường nguyễn huệ", "huệ" }) {
            mvc.perform(get("/api/masterdata/streets/suggest").param("q", q).header(HttpHeaders.AUTHORIZATION, officer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.streets.length()").value(2))
                    .andExpect(jsonPath("$.streets[*].districtName").value(org.hamcrest.Matchers.containsInAnyOrder("Đông Thạnh", "Nhị Bình")));
        }
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "nguyen hue").param("districtId", dth.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$.streets.length()").value(1))
                .andExpect(jsonPath("$.streets[0].id").value(huDth.getId()));
    }

    @Test
    void wildcardsInQueryAreNotTreatedAsLikePatterns() throws Exception {
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "%%").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$.streets.length()").value(0));
    }

    @Test
    void goongOnlyAskedWhenCatalogIsThinAndItsOutageDoesNotBreakSuggest() throws Exception {
        // Danh mục đã đủ gợi ý (≥3) thì không tốn hạn mức Goong.
        streets.save(Street.create(dth, "Đường Huệ A", null));
        streets.save(Street.create(dth, "Đường Huệ B", null));
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "hue").param("districtId", dth.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, officer)).andExpect(jsonPath("$.streets.length()").value(3));
        verify(goong, never()).autocomplete(anyString(), anyInt());

        when(goong.autocomplete(anyString(), anyInt()))
                .thenReturn(new GoongClient.Result(GoongClient.Status.UNAVAILABLE, List.of()));
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "le loi").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streets.length()").value(0))
                .andExpect(jsonPath("$.goongStatus").value("UNAVAILABLE"));

        when(goong.autocomplete(anyString(), anyInt())).thenReturn(new GoongClient.Result(GoongClient.Status.OK,
                List.of(new GoongClient.Suggestion("pid", "Đường Lê Lợi", "Đông Thạnh"),
                        new GoongClient.Suggestion("pid2", "Đường Nguyễn Huệ", "Đông Thạnh"),
                        new GoongClient.Suggestion("pid3", "Đường Lê Văn Khương", "Thới An, Hồ Chí Minh"))));
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "nguyen hue").param("districtId", nb.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$.streets.length()").value(1))
                // Đường đã có trong danh mục thì không lặp lại ở phần Goong; đường ngoài xã bị bỏ; đường lạ chỉ là tham khảo.
                .andExpect(jsonPath("$.external.length()").value(1))
                .andExpect(jsonPath("$.external[0].name").value("Đường Lê Lợi"));
    }

    @Test
    void suggestAndCreateStreetAreOfficerOnlyAndCreateIsAuditedAndDeduplicated() throws Exception {
        String company = token("dv01_it", Role.COMPANY_MANAGER, companies.save(
                Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1))).getId());
        mvc.perform(get("/api/masterdata/streets/suggest").param("q", "hue").header(HttpHeaders.AUTHORIZATION, company))
                .andExpect(status().isForbidden());

        String req = "{\"districtId\":%d,\"name\":\"Đường Lê Lợi\",\"goongPlaceId\":\"pid\"}".formatted(dth.getId());
        mvc.perform(post("/api/masterdata/streets").header(HttpHeaders.AUTHORIZATION, company)
                .contentType(MediaType.APPLICATION_JSON).content(req)).andExpect(status().isForbidden());
        mvc.perform(post("/api/masterdata/streets").header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content(req))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.goongLinked").value(true));
        // Viết khác nhưng cùng đường, cùng xã → 409.
        mvc.perform(post("/api/masterdata/streets").header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"districtId\":%d,\"name\":\"le  loi\"}".formatted(dth.getId())))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STREET_EXISTS"));
        assertThat(jdbc.queryForList("select action from audit_logs where action = 'CREATE_STREET'", String.class)).hasSize(1);
    }

    // ---- hồ sơ hộ

    @Test
    void savedHouseholdLinksToStreetIdAndStreetMustBelongToAreaDistrict() throws Exception {
        create(kv07, huDth.getId(), "12A", null, "", "")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.streetId").value(huDth.getId()))
                .andExpect(jsonPath("$.street").value("Đường Nguyễn Huệ"))
                .andExpect(jsonPath("$.address").value("12A Đường Nguyễn Huệ"));
        // Đường của Nhị Bình không dùng được cho tổ thuộc Đông Thạnh.
        create(kv07, huNb.getId(), "5", null, "", "").andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("STREET_DISTRICT_MISMATCH"));
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
