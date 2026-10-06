package vn.dongthanh.vsmt.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.notification.service.HouseholdReminderService;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;
import vn.dongthanh.vsmt.support.MutableClock;

/** Nhắc hộ dân (góp ý BA 03/10): hạn hộ 25/10/2026; hộ H000001 có app, hộ H000002 không có tài khoản. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class HouseholdReminderIT extends IntegrationTest {

    @Autowired HouseholdReminderService reminders;
    @Autowired NotificationService notifications;
    @Autowired CitizenAccountRepository accounts;
    @Autowired vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository subjects;
    @Autowired CollectionFixture fx;
    @Autowired MutableClock clock;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;

    Long citizenId;

    @BeforeEach
    void seed() {
        fx.build();
        citizenId = accounts.save(CitizenAccount.create("0902000001",
                subjects.findByCode("DTH-H000001").orElseThrow(), "Chủ hộ 1")).getId();
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    long unread() {
        return notifications.unreadCountForCitizen(citizenId);
    }

    @Test
    void openReminderGoesOnceAndOnlyToHouseholdsWithAnApp() {
        assertThat(reminders.run()).isEqualTo(1);
        assertThat(unread()).isEqualTo(1);
        // Bấm thông báo phải mở màn Khoản thu của app.
        assertThat(jdbc.queryForObject("select link from notifications where recipient_citizen_id = ?", String.class,
                citizenId)).contains("citizen.charges");
        // Chạy lại cùng ngày không gửi trùng.
        assertThat(reminders.run()).isZero();
        assertThat(unread()).isEqualTo(1);
    }

    @Test
    void dueSoonThreeDaysBeforeAndOverdueOneDayAfter() {
        reminders.run(); // OPEN
        clock.set(OffsetDateTime.parse("2026-10-27T08:00:00+07:00").toInstant());
        assertThat(reminders.run()).isZero(); // còn 4 ngày: chưa tới mốc
        clock.set(OffsetDateTime.parse("2026-10-28T08:00:00+07:00").toInstant());
        assertThat(reminders.run()).isEqualTo(1); // đúng trước hạn 3 ngày
        assertThat(reminders.run()).isZero();
        clock.set(OffsetDateTime.parse("2026-11-01T08:00:00+07:00").toInstant());
        assertThat(reminders.run()).isEqualTo(1); // quá hạn 1 ngày
        assertThat(unread()).isEqualTo(3);
    }

    @Test
    void paidHouseholdIsNotReminded() {
        reminders.run(); // OPEN
        jdbc.update("update charges set status = 'PAID', paid_at = now() where id = ?", fx.chargeId("DTH-H000001"));
        clock.set(OffsetDateTime.parse("2026-10-28T08:00:00+07:00").toInstant());
        assertThat(reminders.run()).isZero();
        assertThat(unread()).isEqualTo(1);
    }

    @Test
    void onlyCommuneOfficerCanRunItByHand() throws Exception {
        mvc.perform(post("/api/notifications/household-reminders/run")
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/notifications/household-reminders/run")
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(1));
        // BR-GEN-03: chạy tay có audit ai chạy và gửi bao nhiêu.
        assertThat(jdbc.queryForObject("select (after_data->>'sent')::int from audit_logs"
                + " where action = 'RUN_HOUSEHOLD_REMINDERS'", Integer.class)).isEqualTo(1);
    }
}
