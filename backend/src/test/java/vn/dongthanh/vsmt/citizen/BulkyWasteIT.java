package vn.dongthanh.vsmt.citizen;

import static java.util.Collections.nCopies;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** T45: dân (KV07) tạo → yêu cầu gán DV01 → DV01 báo phí → dân thấy "Đã báo phí"; DV07 không thấy; không sinh Charge. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class BulkyWasteIT extends IntegrationTest {

    static final String TODAY = "2026-10-01";

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired AreaRepository areas;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'};

    @Value("${vsmt.upload-dir}") String uploadDir;

    CitizenAccount citizenA;
    CitizenAccount citizenB;
    int chargesBefore;
    /** Ảnh ghi ra đĩa không theo rollback của test: xóa sau mỗi test. */
    final List<String> uploaded = new ArrayList<>();

    @AfterEach
    void deleteUploads() throws IOException {
        for (String name : uploaded) {
            Files.deleteIfExists(Path.of(uploadDir, name));
        }
    }

    @BeforeEach
    void setUp() {
        fx.build();
        citizenA = accounts.save(CitizenAccount.create("0902000001",
                subjects.findByCode("DTH-H000001").orElseThrow(), "Chủ hộ A"));
        citizenB = accounts.save(CitizenAccount.create("0902000005",
                subjects.findByCode("DTH-H000005").orElseThrow(), "Chủ hộ B"));
        chargesBefore = jdbc.queryForObject("select count(*) from charges", Integer.class);
    }

    @Test
    void citizenCreatesRequestAssignedToServingCompanyAndCompanyIsNotified() throws Exception {
        citizen(citizenA, post("/api/citizen/bulky-requests"), """
                {"itemType": "MATTRESS", "itemDescription": "Nệm cũ 1m6 + 2 ghế hỏng", "quantity": 2,
                 "preferredDate": "2026-10-18", "preferredSlot": "MORNING"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("CK-1026-001"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.companyName").value("Công ty Một"))
                .andExpect(jsonPath("$.subjectCode").value("DTH-H000001"))
                .andExpect(jsonPath("$.citizenName").value("Chủ hộ A"))
                .andExpect(jsonPath("$.areaCode").value("KV07"))
                .andExpect(jsonPath("$.address").value("Số 1"))
                .andExpect(jsonPath("$.quotedFee").isEmpty())
                .andExpect(jsonPath("$.photoUrls").isEmpty());

        internal(fx.dv01Manager, get("/api/bulky-requests"), null)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].code").value("CK-1026-001"))
                .andExpect(jsonPath("$[0].citizenPhone").value("0902000001"));
        internal(fx.dv01Manager, get("/api/notifications"), null)
                .andExpect(jsonPath("$.items[0].title").value("Yêu cầu rác cồng kềnh mới CK-1026-001 · DTH-H000001"))
                .andExpect(jsonPath("$.items[0].kind").value("INFO"))
                .andExpect(jsonPath("$.items[0].link.screen").value("company.bulky"));
        internal(fx.dv07Manager, get("/api/bulky-requests"), null).andExpect(jsonPath("$").isEmpty());
        internal(fx.officer, get("/api/bulky-requests"), null).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void companyQuotesFeeCitizenSeesQuotedAndNoChargeIsCreated() throws Exception {
        long id = create(citizenA);

        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", id), "{\"fee\": 200000, \"scheduledDate\": \"2026-10-18\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUOTED"))
                .andExpect(jsonPath("$.quotedFee").value(200_000))
                .andExpect(jsonPath("$.scheduledDate").value("2026-10-18"))
                .andExpect(jsonPath("$.quotedAt").isNotEmpty());
        citizen(citizenA, get("/api/citizen/bulky-requests/{id}", id), null)
                .andExpect(jsonPath("$.status").value("QUOTED"))
                .andExpect(jsonPath("$.quotedFee").value(200_000));
        citizen(citizenA, get("/api/citizen/notifications").param("kind", "INFO"), null)
                .andExpect(jsonPath("$.items[0].title").value("Rác cồng kềnh CK-1026-001 · Đã báo phí"))
                .andExpect(jsonPath("$.items[0].body").value(org.hamcrest.Matchers.containsString("200.000")))
                .andExpect(jsonPath("$.items[0].link.screen").value("citizen.bulkyDetail"))
                .andExpect(jsonPath("$.items[0].link.params.requestId").value((int) id));

        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/collected", id), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COLLECTED"))
                .andExpect(jsonPath("$.collectedAt").isNotEmpty());

        assertThat(jdbc.queryForObject("select count(*) from charges", Integer.class)).isEqualTo(chargesBefore);
        assertThat(jdbc.queryForList("select action from audit_logs where entity_type = 'BulkyWasteRequest' order by id",
                String.class)).containsExactly("CREATE_BULKY", "QUOTE_BULKY_FEE", "COLLECT_BULKY");
        assertThat(jdbc.queryForObject("select count(*) from notifications where recipient_citizen_id = ?", Integer.class,
                citizenA.getId())).isEqualTo(2);
    }

    @Test
    void quoteRulesFeePositiveDateNotPastOnlyPendingOnlyOwnCompany() throws Exception {
        long id = create(citizenA);

        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", id), "{\"fee\": 0}")
                .andExpect(status().isBadRequest());
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", id), "{\"fee\": 100000, \"scheduledDate\": \"2026-09-30\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_DATE_PAST"));
        internal(fx.dv07Manager, post("/api/bulky-requests/{id}/quote", id), "{\"fee\": 100000}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BULKY_REQUEST_NOT_FOUND"));
        internal(fx.officer, post("/api/bulky-requests/{id}/quote", id), "{\"fee\": 100000}")
                .andExpect(status().isForbidden());
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/collected", id), null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_STATUS_INVALID"));

        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", id), "{\"fee\": 150000}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scheduledDate").value("2026-10-18"));
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", id), "{\"fee\": 150000}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_STATUS_INVALID"));
    }

    @Test
    void citizenCancelsWithReasonButNotAfterCollection() throws Exception {
        long id = create(citizenA);
        citizen(citizenA, post("/api/citizen/bulky-requests/{id}/cancel", id), "{\"reason\": \"\"}")
                .andExpect(status().isBadRequest());
        citizen(citizenB, post("/api/citizen/bulky-requests/{id}/cancel", id), "{\"reason\": \"x\"}")
                .andExpect(status().isNotFound());
        citizen(citizenA, post("/api/citizen/bulky-requests/{id}/cancel", id), "{\"reason\": \"Đã tự mang đi\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("Đã tự mang đi"));
        internal(fx.dv01Manager, get("/api/notifications"), null)
                .andExpect(jsonPath("$.items[0].title").value("Hộ hủy yêu cầu rác cồng kềnh CK-1026-001"));

        long second = create(citizenA);
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", second), "{\"fee\": 100000}").andExpect(status().isOk());
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/collected", second), null).andExpect(status().isOk());
        citizen(citizenA, post("/api/citizen/bulky-requests/{id}/cancel", second), "{\"reason\": \"Muộn\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_STATUS_INVALID"));
    }

    @Test
    void companyCancelsWithReasonAndCitizenIsNotified() throws Exception {
        long id = create(citizenA);
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/cancel", id), "{\"reason\": \"Xe không vào được hẻm\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        citizen(citizenA, get("/api/citizen/notifications"), null)
                .andExpect(jsonPath("$.items[0].title").value("Rác cồng kềnh CK-1026-001 · Công ty từ chối"));
    }

    @Test
    void listIsScopedToOwnHouseholdAndValidationApplies() throws Exception {
        long idA = create(citizenA);
        long idB = create(citizenB);
        citizen(citizenA, get("/api/citizen/bulky-requests"), null)
                .andExpect(jsonPath("$[*].id").value(contains((int) idA)));
        citizen(citizenA, get("/api/citizen/bulky-requests/{id}", idB), null).andExpect(status().isNotFound());
        internal(fx.dv07Manager, get("/api/bulky-requests"), null).andExpect(jsonPath("$[*].id").value(contains((int) idB)));

        citizen(citizenA, post("/api/citizen/bulky-requests"), "{\"itemType\": \"DEBRIS\", \"quantity\": 0, \"preferredDate\": \"2026-10-18\"}")
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/bulky-requests"), "{\"itemType\": \"DEBRIS\", \"quantity\": 1, \"preferredDate\": \"2026-09-30\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_DATE_PAST"));
    }

    @Test
    void photoNamesMustBeUploadedPhotosNotUrls() throws Exception {
        String photo = upload(citizenA);
        for (String photos : new String[] {"[null]", "[\"https://a.vn/x.jpg\"]", "[\"../" + photo + "\"]",
                json.writeValueAsString(nCopies(6, photo))}) {
            citizen(citizenA, post("/api/citizen/bulky-requests"), withPhotos(photos))
                    .andExpect(status().isBadRequest());
        }
        citizen(citizenA, post("/api/citizen/bulky-requests"), withPhotos("[\"" + UUID.randomUUID() + ".jpg\"]"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));
        assertThat(jdbc.queryForObject("select count(*) from bulky_waste_requests", Integer.class)).isZero();
    }

    @Test
    void citizenAttachesUploadedPhotosAndServingCompanyOfficerAdminCanViewThem() throws Exception {
        String photo = upload(citizenA);
        // Tên trùng chỉ lưu một lần.
        String body = citizen(citizenA, post("/api/citizen/bulky-requests"),
                withPhotos(json.writeValueAsString(List.of(photo, photo))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.photoUrls").value(contains("/api/citizen/photos/" + photo)))
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        String companyUrl = "/api/bulky-requests/" + id + "/photos/" + photo;

        citizen(citizenA, get("/api/citizen/bulky-requests/{id}", id), null)
                .andExpect(jsonPath("$.photoUrls").value(contains("/api/citizen/photos/" + photo)));
        citizen(citizenA, get("/api/citizen/photos/{name}", photo), null)
                .andExpect(status().isOk())
                .andExpect(content().bytes(JPEG));
        internal(fx.dv01Manager, get("/api/bulky-requests"), null)
                .andExpect(jsonPath("$[0].photoUrls").value(contains(companyUrl)));
        for (User reader : List.of(fx.dv01Manager, fx.officer, fx.admin)) {
            internal(reader, get(companyUrl), null)
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                    .andExpect(content().bytes(JPEG));
        }
    }

    @Test
    void companyPhotoIsOnlyServedForOwnRequestAndPhotosAttachedToIt() throws Exception {
        String photoA = upload(citizenA);
        String photoB = upload(citizenB);
        String notAttached = upload(citizenA);
        long idA = createWithPhoto(citizenA, photoA);
        long idB = createWithPhoto(citizenB, photoB);
        String path = "/api/bulky-requests/{id}/photos/{name}";

        internal(fx.dv07Manager, get(path, idA, photoA), null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BULKY_REQUEST_NOT_FOUND"));
        internal(fx.dv01Manager, get(path, idA, notAttached), null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));
        // Ảnh của yêu cầu khác không đọc được qua yêu cầu mình phụ trách.
        internal(fx.dv07Manager, get(path, idB, photoA), null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));
        internal(fx.dv07Manager, get(path, idB, photoB), null).andExpect(status().isOk());
        internal(fx.dv01Manager, get(path, 999_999, photoA), null).andExpect(status().isNotFound());
        internal(fx.dv01Manager, get(path, idA, "evil.txt"), null).andExpect(status().isBadRequest());
        citizen(citizenA, get(path, idA, photoA), null).andExpect(status().isForbidden());
    }

    @Test
    void companyNotificationsGoToManagersOnly() throws Exception {
        long id = create(citizenA);
        citizen(citizenA, post("/api/citizen/bulky-requests/{id}/cancel", id), "{\"reason\": \"Đã tự xử lý\"}")
                .andExpect(status().isOk());
        assertThat(jdbc.queryForList("select recipient_role from notifications where recipient_company_id = ?",
                String.class, fx.dv01.getId())).hasSize(2).containsOnly("COMPANY_MANAGER");
    }

    @Test
    void quoteOnCancelledRequestReportsStatusInVietnameseBeforeDate() throws Exception {
        long id = create(citizenA);
        citizen(citizenA, post("/api/citizen/bulky-requests/{id}/cancel", id), "{\"reason\": \"Đã tự xử lý\"}")
                .andExpect(status().isOk());
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", id), "{\"fee\": 150000, \"scheduledDate\": \"2026-09-30\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_STATUS_INVALID"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("\"Đã hủy\"")));
    }

    @Test
    void datesFeeAndOpenRequestsHaveUpperBounds() throws Exception {
        citizen(citizenA, post("/api/citizen/bulky-requests"), "{\"itemType\": \"DEBRIS\", \"quantity\": 1, \"preferredDate\": \"2026-11-01\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_DATE_TOO_FAR"));

        long first = create(citizenA);
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", first), "{\"fee\": 10000001}")
                .andExpect(status().isBadRequest());
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", first), "{\"fee\": 150000, \"scheduledDate\": \"2026-11-01\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_DATE_TOO_FAR"));
        internal(fx.dv01Manager, post("/api/bulky-requests/{id}/quote", first), "{\"fee\": 10000000, \"scheduledDate\": \"2026-10-31\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUOTED"));

        for (int i = 1; i < 3; i++) {
            create(citizenA);
        }
        citizen(citizenA, post("/api/citizen/bulky-requests"), "{\"itemType\": \"DEBRIS\", \"quantity\": 1, \"preferredDate\": \"2026-10-18\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_TOO_MANY_OPEN"));
        // Hủy bớt một yêu cầu thì đăng ký tiếp được.
        citizen(citizenA, post("/api/citizen/bulky-requests/{id}/cancel", first), "{\"reason\": \"Đăng ký trùng\"}")
                .andExpect(status().isOk());
        create(citizenA);
    }

    @Test
    void citizenCreateAndCancelAreAudited() throws Exception {
        long id = create(citizenA);
        citizen(citizenA, post("/api/citizen/bulky-requests/{id}/cancel", id), "{\"reason\": \"Đã tự xử lý\"}")
                .andExpect(status().isOk());
        assertThat(jdbc.queryForList("select action || ':' || actor_username from audit_logs where entity_type = 'BulkyWasteRequest'"
                + " order by id", String.class))
                .containsExactly("CREATE_BULKY:citizen:0902000001", "CITIZEN_CANCEL_BULKY:citizen:0902000001");
    }

    @Test
    void areaWithoutCompanyIsRejected() throws Exception {
        Area kv24 = areas.save(Area.create("KV24", "Tổ 24", fx.kv07.getDistrict()));
        ServiceSubject orphan = ServiceSubject.create("NB-H000999", SubjectType.HOUSEHOLD, "Hộ chưa có công ty", "Số 9", kv24);
        subjects.save(orphan);
        CitizenAccount citizen = accounts.save(CitizenAccount.create("0902000999", orphan, "Chủ hộ 24"));

        citizen(citizen, post("/api/citizen/bulky-requests"), "{\"itemType\": \"DEBRIS\", \"quantity\": 1, \"preferredDate\": \"2026-10-18\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BULKY_NO_COMPANY"));
    }

    private String upload(CitizenAccount citizen) throws Exception {
        String body = citizen(citizen, multipart("/api/citizen/photos")
                .file(new MockMultipartFile("file", "anh.jpg", MediaType.IMAGE_JPEG_VALUE, JPEG)), null)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String name = json.readTree(body).get("name").asText();
        uploaded.add(name);
        return name;
    }

    private long createWithPhoto(CitizenAccount citizen, String photo) throws Exception {
        String body = citizen(citizen, post("/api/citizen/bulky-requests"), withPhotos("[\"" + photo + "\"]"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private static String withPhotos(String photoNamesJson) {
        return "{\"itemType\": \"DEBRIS\", \"quantity\": 1, \"preferredDate\": \"2026-10-18\", \"photoNames\": "
                + photoNamesJson + "}";
    }

    private long create(CitizenAccount citizen) throws Exception {
        String body = citizen(citizen, post("/api/citizen/bulky-requests"), """
                {"itemType": "FURNITURE", "quantity": 1, "preferredDate": "2026-10-18"}""")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private ResultActions citizen(CitizenAccount a, MockHttpServletRequestBuilder req, String body) throws Exception {
        req.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.issueCitizen(a.getId(), a.getSubject().getId()).value());
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }

    private ResultActions internal(User user, MockHttpServletRequestBuilder req, String body) throws Exception {
        req.header(HttpHeaders.AUTHORIZATION, fx.bearer(user));
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }
}
