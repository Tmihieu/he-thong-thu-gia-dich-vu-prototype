package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.SettlementService;
import vn.dongthanh.vsmt.remittance.service.SettlementService.IssueSettlementCommand;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;
import vn.dongthanh.vsmt.support.MutableClock;

@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class ReminderIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired MutableClock clock;
    @Autowired SettlementService settlements;

    @BeforeEach
    void seed() {
        fx.build();
        // Đã thu đủ tiền mặt cả hai công ty (phải nộp xã tính trên đã thu); DV07 quyết toán kỳ 10 ngày 01/11, DV01 chưa.
        fx.collectAllCash();
        clock.set(Instant.parse("2026-11-01T03:00:00Z"));
        settlements.issue(new IssueSettlementCommand(fx.dv07.getId(), fx.october.getId(), ReceiptMethod.CASH, null,
                null, null, null), fx.actor(fx.officer));
        clock.reset();
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    @Test
    void remindingBeforeTheSettlementDueDateIs422() throws Exception {
        // Đúng hạn quyết toán 05/11 vẫn chưa quá hạn.
        clock.set(Instant.parse("2026-11-05T03:00:00Z"));
        remind(fx.dv01.getId())
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("NO_OVERDUE_DEBT"));
    }

    @Test
    void overdueCompanyIsRemindedAndSeesItOnTheBell() throws Exception {
        clock.set(Instant.parse("2026-11-06T03:00:00Z"));

        mvc.perform(get("/api/remittance/reminders/draft").param("companyId", fx.dv01.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(jsonPath("$.amount").value(320_000))
                .andExpect(jsonPath("$.dueDate").value("2026-11-11"))
                .andExpect(jsonPath("$.debts[0].periodLabel").value("Tháng 10/2026"));

        remind(fx.dv01.getId())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("NN-001"))
                .andExpect(jsonPath("$.amount").value(320_000));

        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$.items[0].kind").value("REMINDER"))
                .andExpect(jsonPath("$.items[0].title").value("Nhắc nộp tiền Tháng 10/2026"))
                .andExpect(jsonPath("$.unreadCount").value(1));
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv07Manager)))
                .andExpect(jsonPath("$.items[?(@.kind == 'REMINDER')]").isEmpty());
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'CREATE_PAYMENT_REMINDER'",
                Integer.class)).isEqualTo(1);

        remind(fx.dv07.getId()).andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/remittance/reminders").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv07Manager)))
                .andExpect(jsonPath("$").isEmpty());
        mvc.perform(get("/api/remittance/reminders").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$[0].settled").value(false));
    }

    private ResultActions remind(Long companyId) throws Exception {
        return mvc.perform(post("/api/remittance/reminders").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer))
                .contentType(MediaType.APPLICATION_JSON).content("{\"companyId\":%d}".formatted(companyId)));
    }
}
