package vn.dongthanh.vsmt.citizen;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.notification.domain.Notification;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** T44: tab Thông báo của người dân chỉ thấy thông báo gửi cho tài khoản mình; nhóm theo loại; đánh dấu đã đọc. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CitizenNotificationIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired NotificationService notifications;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper json;

    CitizenAccount citizenA;
    CitizenAccount citizenB;
    Notification complaintA;
    Notification transactionA;
    Notification forB;

    @BeforeEach
    void setUp() {
        fx.build();
        citizenA = accounts.save(CitizenAccount.create("0902000001",
                subjects.findByCode("DTH-H000001").orElseThrow(), "Chủ hộ A"));
        citizenB = accounts.save(CitizenAccount.create("0902000005",
                subjects.findByCode("DTH-H000005").orElseThrow(), "Chủ hộ B"));
        complaintA = notifications.publish(NotificationCommand.toCitizen(citizenA.getId(), NotificationKind.COMPLAINT,
                "Phản ánh KN-1026-001 · Đang xử lý", "Xã đã chuyển công ty", Map.of("screen", "citizen.complaintDetail",
                        "params", Map.of("complaintId", 42))), fx.officer.getId());
        transactionA = notifications.publish(NotificationCommand.toCitizen(citizenA.getId(), NotificationKind.TRANSACTION,
                "Thanh toán thành công", "Đã thanh toán 80.000 đ", null), null);
        forB = notifications.publish(NotificationCommand.toCitizen(citizenB.getId(), NotificationKind.COMPLAINT,
                "Của hộ B", "x", null), null);
        // Thông báo cho xã và công ty không được lọt sang dân.
        notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.COMPLAINT, "Cho xã", "x",
                null), null);
        notifications.publish(NotificationCommand.toCompany(fx.dv01.getId(), null, NotificationKind.RECEIPT, "Cho DV01",
                "x", null), null);
    }

    @Test
    void listsOnlyOwnNotificationsNewestFirstWithUnreadCountAndKindFilter() throws Exception {
        citizen(citizenA, get("/api/citizen/notifications"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.unreadCount").value(2))
                .andExpect(jsonPath("$.items[*].id").value(contains(transactionA.getId().intValue(),
                        complaintA.getId().intValue())))
                .andExpect(jsonPath("$.items[1].link.screen").value("citizen.complaintDetail"))
                .andExpect(jsonPath("$.items[1].link.params.complaintId").value(42))
                .andExpect(jsonPath("$.items[0].link").isEmpty())
                .andExpect(jsonPath("$.items[0].readAt").isEmpty());

        citizen(citizenA, get("/api/citizen/notifications").param("kind", "COMPLAINT"), null)
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].kind").value("COMPLAINT"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.unreadCount").value(2));
        citizen(citizenB, get("/api/citizen/notifications"), null)
                .andExpect(jsonPath("$.items[*].title").value(contains("Của hộ B")));
        citizen(citizenA, get("/api/citizen/notifications/unread-count"), null)
                .andExpect(jsonPath("$.unreadCount").value(2));
    }

    @Test
    void markReadLowersUnreadCountAndIsScopedToOwner() throws Exception {
        citizen(citizenA, post("/api/citizen/notifications/{id}/read", complaintA.getId()), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readAt").isNotEmpty());
        citizen(citizenA, get("/api/citizen/notifications/unread-count"), null)
                .andExpect(jsonPath("$.unreadCount").value(1));
        citizen(citizenA, get("/api/citizen/notifications").param("unreadOnly", "true"), null)
                .andExpect(jsonPath("$.items[*].id").value(contains(transactionA.getId().intValue())));

        citizen(citizenA, post("/api/citizen/notifications/{id}/read", forB.getId()), null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTIFICATION_NOT_FOUND"));
        citizen(citizenB, get("/api/citizen/notifications/unread-count"), null)
                .andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    void readAllMarksOnlyOwnNotifications() throws Exception {
        citizen(citizenA, post("/api/citizen/notifications/read-all"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
        citizen(citizenB, get("/api/citizen/notifications/unread-count"), null)
                .andExpect(jsonPath("$.unreadCount").value(1));
        // Xã vẫn còn thông báo chưa đọc của mình.
        mvc.perform(get("/api/notifications/unread-count").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    void appPaymentAndClosedComplaintShowUpAsNotifications() throws Exception {
        citizen(citizenA, post("/api/citizen/payments"), "{\"chargeId\": %d, \"amount\": 80000, \"clientRequestId\": \"n-1\"}"
                .formatted(fx.chargeId("DTH-H000001"))).andExpect(status().isOk());
        String body = citizen(citizenA, post("/api/citizen/complaints"),
                "{\"category\": \"OTHER\", \"content\": \"Có mùi hôi ở điểm tập kết\"}")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long complaintId = json.readTree(body).at("/complaint/id").asLong();
        mvc.perform(post("/api/complaints/{id}/close", complaintId).header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer))
                .contentType(MediaType.APPLICATION_JSON).content("{\"resolution\": \"Đã dọn\"}")).andExpect(status().isOk());

        citizen(citizenA, get("/api/citizen/notifications").param("kind", "TRANSACTION"), null)
                .andExpect(jsonPath("$.items[0].title").value("Thanh toán thành công"))
                .andExpect(jsonPath("$.items[0].link.screen").value("citizen.paymentConfirmation"))
                .andExpect(jsonPath("$.items[0].link.params.paymentId").isNumber());
        citizen(citizenA, get("/api/citizen/notifications").param("kind", "COMPLAINT"), null)
                .andExpect(jsonPath("$.items[0].title").value("Phản ánh KN-1026-001 · Đã giải quyết"))
                .andExpect(jsonPath("$.items[0].link.screen").value("citizen.complaintDetail"))
                .andExpect(jsonPath("$.items[0].link.params.complaintId").value((int) complaintId));
    }

    @Test
    void internalTokenIsRejected() throws Exception {
        mvc.perform(get("/api/citizen/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(status().isForbidden());
    }

    private ResultActions citizen(CitizenAccount a, MockHttpServletRequestBuilder req, String body) throws Exception {
        req.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.issueCitizen(a.getId(), a.getSubject().getId()).value());
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }
}
