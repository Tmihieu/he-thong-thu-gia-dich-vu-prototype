package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.masterdata.service.PeriodService;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class PeriodLockIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired PeriodService periods;
    @Autowired CompanyReceiptService receipts;

    @BeforeEach
    void seed() {
        fx.build();
        periods.startCollecting(fx.october.getId(), fx.actor(fx.admin));
    }

    @Test
    void lockingWithDebtIs422ListingCompaniesAndAmounts() throws Exception {
        lock(fx.officer)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_HAS_DEBT"))
                .andExpect(jsonPath("$.message").value(allOf(containsString("DV01: 320.000 đ"),
                        containsString("DV07: 160.000 đ"))));
        lock(fx.admin).andExpect(status().isForbidden());
    }

    @Test
    void afterLockingNothingCanChangeThePeriod() throws Exception {
        remitInFull();
        lock(fx.officer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"))
                .andExpect(jsonPath("$.lockedAt").isNotEmpty());
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'LOCK_PERIOD'", Integer.class))
                .isEqualTo(1);

        String officer = fx.bearer(fx.officer);
        post("/api/billing/charge-requests", officer, """
                {"periodId":%d,"feeTypeId":%d,"scopeType":"ALL","dueDate":"2026-10-25"}"""
                .formatted(fx.october.getId(), fx.env.getId()))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
        post("/api/collection/payments", fx.bearer(fx.thu07), """
                {"chargeId":%d,"amount":80000,"method":"CASH","clientRequestId":"after-lock"}"""
                .formatted(fx.chargeId("DTH-H000001")))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
        post("/api/collection/visits", fx.bearer(fx.thu07), """
                {"chargeId":%d,"result":"ABSENT","clientRequestId":"visit-after-lock"}"""
                .formatted(fx.chargeId("DTH-H000002")))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
        post("/api/remittance/receipts", officer, """
                {"companyId":%d,"periodId":%d,"amount":1000,"method":"CASH"}"""
                .formatted(fx.dv01.getId(), fx.october.getId()))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
        lock(fx.officer).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_INVALID_TRANSITION"));
    }

    private void remitInFull() {
        receipts.issue(new IssueReceiptCommand(fx.dv01.getId(), fx.october.getId(), 320_000, ReceiptMethod.TRANSFER,
                null, null, null, null), fx.actor(fx.officer));
        receipts.issue(new IssueReceiptCommand(fx.dv07.getId(), fx.october.getId(), 160_000, ReceiptMethod.TRANSFER,
                null, null, null, null), fx.actor(fx.officer));
    }

    private ResultActions lock(User user) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.post("/api/remittance/periods/" + fx.october.getId() + "/lock")
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(user)));
    }

    private ResultActions post(String path, String token, String body) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.post(path)
                .header(HttpHeaders.AUTHORIZATION, token).contentType(MediaType.APPLICATION_JSON).content(body));
    }
}
