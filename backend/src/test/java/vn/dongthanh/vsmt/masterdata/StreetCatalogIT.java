package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.util.List;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.masterdata.domain.Street;
import vn.dongthanh.vsmt.masterdata.domain.StreetRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Danh mục đường do quản trị viên quản lý: thêm, đổi tên giữ tên cũ, nhập Excel, gắn hồ sơ chờ xác minh. */
@Transactional
class StreetCatalogIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    DistrictRepository districts;
    @Autowired
    AreaRepository areas;
    @Autowired
    StreetRepository streets;
    @Autowired
    UserRepository users;
    @Autowired
    JwtService jwt;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    ObjectMapper json;
    @PersistenceContext
    EntityManager em;

    Area ap1;
    Area ap2;
    String admin;
    String officer;

    @BeforeEach
    void seed() {
        District dth = districts.save(District.create("DTH", "Đông Thạnh"));
        ap1 = areas.save(Area.create("AP01", "Ấp 1", dth));
        ap2 = areas.save(Area.create("AP02", "Ấp 2", dth));
        admin = token("admin_it", Role.ADMIN);
        officer = token("canbo_it", Role.COMMUNE_OFFICER);
    }

    @Test
    void adminAddsStreetsAndAlleysAndOfficerSeesTheCatalog() throws Exception {
        long toKy = id(create("{\"name\":\"Tô Ký\",\"kind\":\"STREET\",\"areaIds\":[%d,%d]}".formatted(ap1.getId(), ap2.getId()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.displayName").value("Tô Ký")));
        // Gõ cả tên đường vào tên hẻm: lưu tên ngắn, hiển thị kèm đường.
        create("{\"name\":\"Hẻm 19 Tô Ký\",\"kind\":\"ALLEY\",\"parentId\":%d}".formatted(toKy))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Hẻm 19"))
                .andExpect(jsonPath("$.displayName").value("Hẻm 19 Tô Ký"))
                .andExpect(jsonPath("$.parentId").value(toKy));
        create("{\"name\":\"hẻm  19\",\"kind\":\"ALLEY\",\"parentId\":%d}".formatted(toKy))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STREET_EXISTS"));
        create("{\"name\":\"TÔ KÝ\",\"kind\":\"STREET\"}").andExpect(status().isConflict());
        create("{\"name\":\"Hẻm 3\",\"kind\":\"ALLEY\"}").andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("ALLEY_PARENT_REQUIRED"));
        create("{\"name\":\"X\",\"kind\":\"STREET\",\"areaIds\":[999999]}").andExpect(status().isNotFound());

        mvc.perform(get("/api/masterdata/streets").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].kind").value("STREET"))
                .andExpect(jsonPath("$[0].areaIds.length()").value(2))
                .andExpect(jsonPath("$[1].displayName").value("Hẻm 19 Tô Ký"));
        assertThat(jdbc.queryForList("select action from audit_logs where action = 'CREATE_STREET'", String.class)).hasSize(2);
    }

    @Test
    void renameKeepsOldNameAndUpdatesAddressesOfStreetAndItsAlleys() throws Exception {
        long dt8 = id(create("{\"name\":\"Đông Thạnh 8\",\"kind\":\"STREET\",\"areaIds\":[%d]}".formatted(ap1.getId())));
        long alley = id(create("{\"name\":\"Hẻm 12\",\"kind\":\"ALLEY\",\"parentId\":%d}".formatted(dt8)));
        long onStreet = subject("Số 5", dt8);
        long onAlley = subject("12/3", alley);

        mvc.perform(put("/api/masterdata/streets/" + dt8).header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Nguyễn Thị Mực\",\"areaIds\":[%d],\"renameNote\":\"NQ 380/NQ-HĐND 24/7/2025\"}".formatted(ap1.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Nguyễn Thị Mực"))
                .andExpect(jsonPath("$.oldNames[0].name").value("Đông Thạnh 8"))
                .andExpect(jsonPath("$.oldNames[0].note").value("NQ 380/NQ-HĐND 24/7/2025"));
        em.flush();
        assertThat(jdbc.queryForObject("select address from service_subjects where id = ?", String.class, onStreet))
                .isEqualTo("Số 5 Nguyễn Thị Mực");
        assertThat(jdbc.queryForObject("select address from service_subjects where id = ?", String.class, onAlley))
                .isEqualTo("12/3 Hẻm 12 Nguyễn Thị Mực");

        // Ngừng dùng: không chọn được cho hộ mới.
        mvc.perform(put("/api/masterdata/streets/" + alley).header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Hẻm 12\",\"status\":\"INACTIVE\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content(subjectJson("9", alley)))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("STREET_INACTIVE"));
    }

    @Test
    void pendingGroupsAreLinkedInOneGoAndAutoMatchUsesNamesOldNamesAndAlleyNames() throws Exception {
        long toKy = id(create("{\"name\":\"Tô Ký\",\"kind\":\"STREET\"}"));
        Street muc = Street.street("Nguyễn Thị Mực");
        muc.addOldName("Đông Thạnh 8", "NQ 380");
        muc = streets.save(muc);
        streets.save(Street.alley(muc, "Hẻm 4"));
        legacy("Số 1", "đường Tô Ký", false);
        legacy("Số 2", "Đông Thạnh 8", false);           // tên cũ
        legacy("4/1", "Hẻm 4 đường Đông Thạnh 8", false); // hẻm, đường ghi tên cũ
        legacy("7", "Hẻm 45 Tô Ký", true);
        legacy("9", "hẻm 45  tô ký", true);
        legacy("3", "đường Mẫu", false);

        mvc.perform(get("/api/masterdata/streets/pending").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/masterdata/streets/auto-match").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matched").value(3))
                .andExpect(jsonPath("$.remaining").value(3));
        em.flush();
        assertThat(jdbc.queryForList("select address from service_subjects where street_id is not null order by address", String.class))
                .containsExactly("4/1 Hẻm 4 Nguyễn Thị Mực", "Số 1 Tô Ký", "Số 2 Nguyễn Thị Mực");

        // Còn lại: nhóm chờ xác minh (2 hộ, cách viết khác nhau) đứng trước nhóm địa chỉ cũ.
        JsonNode groups = body(mvc.perform(get("/api/masterdata/streets/pending").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].subjectCount").value(2))
                .andExpect(jsonPath("$[0].pendingCount").value(2))
                .andExpect(jsonPath("$[0].areaNames[0]").value("Ấp 1")));
        String key = groups.get(0).get("key").asText();
        long hem45 = id(create("{\"name\":\"Hẻm 45\",\"kind\":\"ALLEY\",\"parentId\":%d}".formatted(toKy)));
        mvc.perform(post("/api/masterdata/streets/pending/link").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"key\":\"%s\",\"streetId\":%d}".formatted(key, hem45)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
        em.flush();
        assertThat(jdbc.queryForList("select address from service_subjects where street_id = ? order by address", String.class, hem45))
                .containsExactly("7 Hẻm 45 Tô Ký", "9 Hẻm 45 Tô Ký");
        assertThat(jdbc.queryForObject("select count(*) from service_subjects where street_pending", Integer.class)).isZero();
    }

    @Test
    void importReadsTheReviewedDraftSkipsRemovedRowsRenamesAndMerges() throws Exception {
        String[] head = { "STT", "Tên (theo OSM)", "Loại", "Thuộc đường (với hẻm)", "Ấp đi qua", "Xã cũ",
            "Cần kiểm đổi tên NQ 380", "Tên mới / tên đúng (xã điền)", "Xã xác nhận (Đúng/Sửa/Bỏ)", "Ghi chú của xã",
            "Cách viết khác trên OSM", "Loại đường OSM" };
        byte[] file = xlsx(head, List.of(
                new String[] { "1", "Tô Ký", "Đường", "", "Ấp 1, Ấp 2", "", "", "", "Đúng" },
                new String[] { "2", "Đông Thạnh 4-1", "Đường", "", "Ấp 1", "", "Nên kiểm", "Nguyễn Thị Tạo", "Sửa" },
                new String[] { "3", "Đông Thạnh 5", "Đường", "", "Ấp 2", "", "Nên kiểm", "Nguyễn Thị Tạo", "Sửa" },
                new String[] { "4", "Hẻm 19 Tô Ký", "Hẻm", "Tô Ký", "Ấp 1", "", "", "", "Đúng" },
                new String[] { "5", "Hẻm 3 Đông Thạnh 5", "Hẻm", "Đông Thạnh 5", "", "", "", "", "" },
                new String[] { "6", "Tân Chánh Hiệp 39", "Đường", "", "Ấp 1", "", "", "", "Bỏ" },
                new String[] { "7", "Cầu Dừa", "Cầu", "", "Ấp 2", "", "", "", "" }));

        mvc.perform(multipart("/api/masterdata/streets/import/preview").file(new MockMultipartFile("file", "x.xlsx", null, file))
                .header(HttpHeaders.AUTHORIZATION, officer)).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/masterdata/streets/import/preview").file(new MockMultipartFile("file", "x.xlsx", null, file))
                .header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.added").value(4))
                .andExpect(jsonPath("$.skipped").value(2))
                .andExpect(jsonPath("$.invalid").value(0))
                .andExpect(jsonPath("$.rows[2].action").value("Gộp với dòng trên"))
                .andExpect(jsonPath("$.rows[4].name").value("Hẻm 3 Nguyễn Thị Tạo"));
        assertThat(streets.count()).isZero();

        mvc.perform(multipart("/api/masterdata/streets/import").file(new MockMultipartFile("file", "x.xlsx", null, file))
                .header(HttpHeaders.AUTHORIZATION, admin)).andExpect(status().isOk());
        em.flush();
        em.clear();
        assertThat(jdbc.queryForList("select name from streets order by name", String.class))
                .containsExactly("Hẻm 19", "Hẻm 3", "Nguyễn Thị Tạo", "Tô Ký");
        assertThat(jdbc.queryForList("select o.name from street_old_names o join streets s on s.id = o.street_id"
                + " where s.name = 'Nguyễn Thị Tạo' order by o.name", String.class)).containsExactly("Đông Thạnh 4-1", "Đông Thạnh 5");
        assertThat(jdbc.queryForObject("select count(*) from street_areas sa join streets s on s.id = sa.street_id"
                + " where s.name = 'Nguyễn Thị Tạo'", Integer.class)).isEqualTo(2);

        // Tải lại cùng file: không tạo trùng.
        mvc.perform(multipart("/api/masterdata/streets/import/preview").file(new MockMultipartFile("file", "x.xlsx", null, file))
                .header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(jsonPath("$.added").value(0)).andExpect(jsonPath("$.updated").value(4));
    }

    @Test
    void importWithErrorsWritesNothing() throws Exception {
        byte[] file = xlsx(new String[] { "Tên đường / hẻm", "Loại", "Thuộc đường (với hẻm)", "Ấp đi qua" }, List.of(
                new String[] { "Tô Ký", "Đường", "", "Ấp 1" },
                new String[] { "Hẻm 5", "Hẻm", "Đường Không Có", "" },
                new String[] { "Lê Lợi", "Đường", "", "Ấp 99" },
                new String[] { "Ngõ 2", "Ngõ", "", "" }));
        mvc.perform(multipart("/api/masterdata/streets/import/preview").file(new MockMultipartFile("file", "x.xlsx", null, file))
                .header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(jsonPath("$.invalid").value(3))
                .andExpect(jsonPath("$.rows[1].errors[0]").value("Không thấy đường 'Đường Không Có' trong file hay danh mục"))
                .andExpect(jsonPath("$.rows[2].errors[0]").value("Không có 'Ấp 99' trong danh sách ấp"))
                .andExpect(jsonPath("$.rows[3].errors[0]").value("Loại phải là Đường hoặc Hẻm"));
        mvc.perform(multipart("/api/masterdata/streets/import").file(new MockMultipartFile("file", "x.xlsx", null, file))
                .header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("IMPORT_HAS_ERRORS"));
        assertThat(streets.count()).isZero();
    }

    // ---- tiện ích

    private ResultActions create(String body) throws Exception {
        return mvc.perform(post("/api/masterdata/streets").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private long subject(String house, long streetId) throws Exception {
        return id(mvc.perform(post("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON).content(subjectJson(house, streetId))).andExpect(status().isCreated()));
    }

    private String subjectJson(String house, long streetId) {
        return "{\"type\":\"HOUSEHOLD\",\"name\":\"Hộ %s\",\"houseNo\":\"%s\",\"streetId\":%d,\"areaId\":%d,\"memberCount\":3}"
                .formatted(house, house, streetId, ap1.getId());
    }

    /** Hồ sơ chưa gắn đường: địa chỉ cũ hoặc cán bộ ghi chờ xác minh. */
    private void legacy(String house, String street, boolean pending) throws Exception {
        mvc.perform(post("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, officer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"HOUSEHOLD\",\"name\":\"Hộ %s\",\"houseNo\":\"%s\",\"street\":\"%s\",\"streetPending\":%s,\"areaId\":%d,\"memberCount\":3}"
                        .formatted(house, house, street, pending, ap1.getId())))
                .andExpect(status().isCreated());
    }

    private static byte[] xlsx(String[] head, List<String[]> rows) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.createSheet("Huong dan").createRow(0).createCell(0).setCellValue("Mục");
            Sheet sheet = wb.createSheet("Danh sach duong");
            Row h = sheet.createRow(0);
            for (int i = 0; i < head.length; i++) {
                h.createCell(i).setCellValue(head[i]);
            }
            for (int r = 0; r < rows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                for (int i = 0; i < rows.get(r).length; i++) {
                    row.createCell(i).setCellValue(rows.get(r)[i]);
                }
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    private long id(ResultActions r) throws Exception {
        return body(r).get("id").asLong();
    }

    private JsonNode body(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    private String token(String username, Role role) {
        User user = users.findByUsername(username)
                .orElseGet(() -> users.save(User.create(username, username, role, null, "x")));
        return "Bearer " + jwt.issue(user).value();
    }
}
