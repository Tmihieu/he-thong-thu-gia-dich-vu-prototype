package vn.dongthanh.vsmt.citizen;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** T43: dân gửi từ app → xã thấy và chuyển DV01 → DV01 phản hồi → xã đóng → app thấy đủ timeline; hộ khác không thấy. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CitizenComplaintIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    CitizenAccount citizenA;
    CitizenAccount citizenB;

    @BeforeEach
    void setUp() {
        fx.build();
        citizenA = accounts.save(CitizenAccount.create("0902000001",
                subjects.findByCode("DTH-H000001").orElseThrow(), "Nguyễn Văn Mẫu"));
        citizenB = accounts.save(CitizenAccount.create("0902000005",
                subjects.findByCode("DTH-H000005").orElseThrow(), "Chủ hộ B"));
    }

    @Test
    void citizenSubmitsComplaintAndCommuneSeesItWithNotification() throws Exception {
        citizen(citizenA, post("/api/citizen/complaints"), """
                {"category": "LATE_COLLECTION", "content": "Lịch thu gom là thứ 3 – 5 – 7 nhưng tuần này chưa thấy xe đến.",
                 "location": "Trước hẻm 12/4"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.complaint.code").value("KN-1026-001"))
                .andExpect(jsonPath("$.complaint.status").value("NEW"))
                .andExpect(jsonPath("$.complaint.category").value("LATE_COLLECTION"))
                .andExpect(jsonPath("$.complaint.areaCode").value("KV07"))
                .andExpect(jsonPath("$.complaint.location").value("Trước hẻm 12/4"))
                .andExpect(jsonPath("$.complaint.summary").value("Lịch thu gom là thứ 3 – 5 – 7 nhưng tuần này chưa thấy xe đến."))
                .andExpect(jsonPath("$.complaint.overdue").value(false))
                .andExpect(jsonPath("$.events", hasSize(1)))
                .andExpect(jsonPath("$.events[0].eventType").value("SUBMITTED"))
                .andExpect(jsonPath("$.events[0].actorLabel").value("Nguyễn Văn Mẫu"));

        assertThat(jdbc.queryForMap("select channel, complainant_name, complainant_phone, citizen_account_id, subject_id"
                + " from complaints where code = 'KN-1026-001'"))
                .containsEntry("channel", "APP")
                .containsEntry("complainant_name", "Nguyễn Văn Mẫu")
                .containsEntry("complainant_phone", "0902000001")
                .containsEntry("citizen_account_id", citizenA.getId())
                .containsEntry("subject_id", citizenA.getSubject().getId());

        internal(fx.officer, get("/api/complaints"), null)
                .andExpect(jsonPath("$[0].code").value("KN-1026-001"))
                .andExpect(jsonPath("$[0].channel").value("APP"))
                .andExpect(jsonPath("$[0].subjectCode").value("DTH-H000001"));
        internal(fx.officer, get("/api/notifications"), null)
                .andExpect(jsonPath("$.items[0].title").value("Phản ánh mới từ app KN-1026-001 · Nguyễn Văn Mẫu"))
                .andExpect(jsonPath("$.items[0].link.screen").value("commune.complaints"));
        // G12: công ty phụ trách khu vực chưa thấy cho tới khi xã chuyển.
        internal(fx.dv01Manager, get("/api/complaints"), null).andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void summaryIsShortenedFromLongContent() throws Exception {
        String content = "Rác tồn nhiều ngày. ".repeat(20).trim();
        citizen(citizenA, post("/api/citizen/complaints"), "{\"category\": \"OTHER\", \"content\": \"" + content + "\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.complaint.summary").value(content.substring(0, 117) + "…"))
                .andExpect(jsonPath("$.complaint.content").value(content))
                .andExpect(jsonPath("$.complaint.location").value("Số 1"));
    }

    @Test
    void blankContentOrMissingCategoryIs400() throws Exception {
        citizen(citizenA, post("/api/citizen/complaints"), "{\"category\": \"OTHER\", \"content\": \"   \"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        citizen(citizenA, post("/api/citizen/complaints"), "{\"content\": \"Có nội dung\"}")
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from complaints", Integer.class)).isZero();
    }

    @Test
    void timelineFollowsCommuneAndCompanyStepsAndCitizenIsNotified() throws Exception {
        long id = submit(citizenA, "Tổ 7 chưa được thu gom 2 ngày liên tiếp");

        internal(fx.officer, post("/api/complaints/{id}/forward", id), "{}").andExpect(status().isOk());
        internal(fx.dv01Manager, post("/api/complaints/{id}/reply", id), "{\"content\": \"Đã bổ sung chuyến trong ngày\"}")
                .andExpect(status().isOk());
        citizen(citizenA, get("/api/citizen/complaints/{id}", id), null)
                .andExpect(jsonPath("$.complaint.status").value("PROCESSING"))
                .andExpect(jsonPath("$.complaint.forwardedCompanyName").value("Công ty Một"))
                .andExpect(jsonPath("$.complaint.deadline").value("2026-10-04"))
                .andExpect(jsonPath("$.events[*].eventType").value(contains("SUBMITTED", "FORWARDED", "COMPANY_REPLIED")));

        internal(fx.officer, post("/api/complaints/{id}/close", id), "{\"resolution\": \"Đã bổ sung chuyến thu gom\"}")
                .andExpect(status().isOk());
        citizen(citizenA, get("/api/citizen/complaints/{id}", id), null)
                .andExpect(jsonPath("$.complaint.status").value("RESOLVED"))
                .andExpect(jsonPath("$.complaint.resolution").value("Đã bổ sung chuyến thu gom"))
                .andExpect(jsonPath("$.events", hasSize(4)))
                .andExpect(jsonPath("$.events[3].eventType").value("CLOSED"));

        assertThat(jdbc.queryForList("select title from notifications where recipient_type = 'CITIZEN'"
                + " and recipient_citizen_id = ? and kind = 'COMPLAINT' order by id", String.class, citizenA.getId()))
                .isNotEmpty()
                .last().isEqualTo("Phản ánh KN-1026-001 · Đã giải quyết");
    }

    @Test
    void listAndDetailAreScopedToOwnHousehold() throws Exception {
        long idA = submit(citizenA, "Của hộ A");
        long idB = submit(citizenB, "Của hộ B");

        citizen(citizenA, get("/api/citizen/complaints"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(idA))
                .andExpect(jsonPath("$[0].content").value("Của hộ A"));
        citizen(citizenB, get("/api/citizen/complaints"), null).andExpect(jsonPath("$[0].id").value(idB));
        citizen(citizenA, get("/api/citizen/complaints/{id}", idB), null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPLAINT_NOT_FOUND"));
        // Hộ cùng tổ, khác tài khoản, cũng không thấy nhau.
        CitizenAccount neighbour = accounts.save(CitizenAccount.create("0902000002",
                subjects.findByCode("DTH-H000002").orElseThrow(), "Hàng xóm"));
        citizen(neighbour, get("/api/citizen/complaints/{id}", idA), null).andExpect(status().isNotFound());
    }

    @Test
    void internalTokenIsRejectedOnCitizenComplaintApi() throws Exception {
        internal(fx.officer, get("/api/citizen/complaints"), null).andExpect(status().isForbidden());
        internal(fx.officer, post("/api/citizen/complaints"), "{\"category\": \"OTHER\", \"content\": \"x\"}")
                .andExpect(status().isForbidden());
    }

    private long submit(CitizenAccount citizen, String content) throws Exception {
        String body = citizen(citizen, post("/api/citizen/complaints"),
                "{\"category\": \"LATE_COLLECTION\", \"content\": \"" + content + "\"}")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).at("/complaint/id").asLong();
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
