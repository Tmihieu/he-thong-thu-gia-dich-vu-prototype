package vn.dongthanh.vsmt.notification;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.notification.domain.Notification;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
class NotificationServiceIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired NotificationService notifications;
    @Autowired CompanyRepository companies;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;

    Company dv01;
    Company dv02;
    User canboA;
    User canboB;
    User dv01User;
    User thu07;
    User dv02User;

    @BeforeEach
    void seed() {
        dv01 = companies.save(Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1)));
        dv02 = companies.save(Company.create("DV02", "Công ty Hai", "B", "0900000002", LocalDate.of(2026, 1, 1)));
        canboA = users.save(User.create("canbo_a", "Cán bộ A", Role.COMMUNE_OFFICER, null, "x"));
        canboB = users.save(User.create("canbo_b", "Cán bộ B", Role.COMMUNE_OFFICER, null, "x"));
        dv01User = users.save(User.create("dv01_it", "DV01", Role.COMPANY_MANAGER, dv01.getId(), "x"));
        thu07 = users.save(User.create("thu07_it", "Người thu", Role.COLLECTOR, dv01.getId(), "x"));
        dv02User = users.save(User.create("dv02_it", "DV02", Role.COMPANY_MANAGER, dv02.getId(), "x"));
    }

    @Test
    void companyNotificationIsInvisibleToOtherCompanies() throws Exception {
        notifications.publish(NotificationCommand.toCompany(dv01.getId(), Role.COMPANY_MANAGER, NotificationKind.REMINDER,
                "Nhắc nộp tiền kỳ 10/2026", "Còn 1.200.000 đ", Map.of("screen", "remittance.receipts",
                        "params", Map.of("periodId", 5))), canboA.getId());

        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(dv01User)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].title").value("Nhắc nộp tiền kỳ 10/2026"))
                .andExpect(jsonPath("$.items[0].link.screen").value("remittance.receipts"))
                .andExpect(jsonPath("$.items[0].link.params.periodId").value(5))
                .andExpect(jsonPath("$.unreadCount").value(1));
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(dv02User)))
                .andExpect(jsonPath("$.total").value(0));
        // Gửi cho quản lý công ty thì người đi thu cùng công ty không thấy.
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(thu07)))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void roleNotificationIsSeenByEveryUserOfTheRoleAndReadStateIsShared() throws Exception {
        Notification n = notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.RECEIPT,
                "DV01 báo sai sót phiếu thu", "Phiếu PT-CT-1026-001 ghi sai số tiền", null), dv01User.getId());

        mvc.perform(get("/api/notifications/unread-count").header(HttpHeaders.AUTHORIZATION, bearer(canboA)))
                .andExpect(jsonPath("$.unreadCount").value(1));
        mvc.perform(get("/api/notifications/unread-count").header(HttpHeaders.AUTHORIZATION, bearer(canboB)))
                .andExpect(jsonPath("$.unreadCount").value(1));

        mvc.perform(post("/api/notifications/" + n.getId() + "/read").header(HttpHeaders.AUTHORIZATION, bearer(canboA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readAt").isNotEmpty());

        // D7: đã đọc tính chung trên bản ghi.
        mvc.perform(get("/api/notifications/unread-count").header(HttpHeaders.AUTHORIZATION, bearer(canboB)))
                .andExpect(jsonPath("$.unreadCount").value(0));
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(dv01User)))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void userNotificationsAndReadAllAndForeignNotification404() throws Exception {
        notifications.publish(NotificationCommand.toUser(thu07.getId(), NotificationKind.INFO, "Bạn được phân tổ KV07",
                "Từ 01/10/2026", null), dv01User.getId());
        Notification companyWide = notifications.publish(NotificationCommand.toCompany(dv01.getId(), null,
                NotificationKind.INFO, "Thông báo chung DV01", "Nội dung", null), null);
        Notification forDv02 = notifications.publish(NotificationCommand.toCompany(dv02.getId(), null,
                NotificationKind.INFO, "Chỉ DV02", "Nội dung", null), null);

        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(thu07)))
                .andExpect(jsonPath("$.items[*].title", contains("Thông báo chung DV01", "Bạn được phân tổ KV07")))
                .andExpect(jsonPath("$.unreadCount").value(2));
        // Lọc theo loại (trung tâm thông báo, T33).
        mvc.perform(get("/api/notifications").param("kind", "INFO").header(HttpHeaders.AUTHORIZATION, bearer(thu07)))
                .andExpect(jsonPath("$.total").value(2));
        mvc.perform(get("/api/notifications").param("kind", "REMINDER").header(HttpHeaders.AUTHORIZATION, bearer(thu07)))
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.unreadCount").value(2));
        mvc.perform(post("/api/notifications/" + forDv02.getId() + "/read").header(HttpHeaders.AUTHORIZATION, bearer(thu07)))
                .andExpect(status().isNotFound());

        mvc.perform(post("/api/notifications/read-all").header(HttpHeaders.AUTHORIZATION, bearer(thu07)))
                .andExpect(jsonPath("$.unreadCount").value(0));
        mvc.perform(get("/api/notifications").param("unreadOnly", "true").header(HttpHeaders.AUTHORIZATION, bearer(dv02User)))
                .andExpect(jsonPath("$.items[*].title", contains("Chỉ DV02")));
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(dv01User)))
                .andExpect(jsonPath("$.items[?(@.id == %d)].readAt".formatted(companyWide.getId())).isNotEmpty());
    }

    private String bearer(User u) {
        return "Bearer " + jwt.issue(u).value();
    }
}
