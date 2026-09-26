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
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
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
    @Autowired CompanyReceiptService receipts;

    @BeforeEach
    void seed() {
        fx.build();
        // DV07 nộp đủ kỳ 10; DV01 chưa nộp.
        receipts.issue(new IssueReceiptCommand(fx.dv07.getId(), fx.october.getId(), 160_000, ReceiptMethod.CASH, null,
                null, null, null), fx.actor(fx.officer));
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    @Test
    void remindingBeforeTheDueDateIs422() throws Exception {
        remind(fx.dv01.getId())
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("NO_OVERDUE_DEBT"));
    }

    @Test
    void overdueCompanyIsRemindedAndSeesItOnTheBell() throws Exception {
        clock.set(Instant.parse("2026-11-03T03:00:00Z"));

        mvc.perform(get("/api/remittance/reminders/draft").param("companyId", fx.dv01.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(jsonPath("$.amount").value(320_000))
                .andExpect(jsonPath("$.dueDate").value("2026-11-08"))
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
                .andExpect(jsonPath("$.total").value(0));
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
