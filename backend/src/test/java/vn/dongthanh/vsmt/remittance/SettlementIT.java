package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;

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

import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;
import vn.dongthanh.vsmt.support.MutableClock;

/**
 * Phiếu quyết toán (07/10): kỳ 10 hạn dân đóng 31/10, hạn quyết toán 05/11. DV01 thu tiền mặt 80.000 + chuyển khoản 80.000,
 * phí thu gom 57.000 mỗi khoản: công ty phải nộp 23.000, xã phải trả 57.000, chênh lệch −34.000 (xã trả công ty).
 */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class SettlementIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired CollectionService collection;
    @Autowired CollectionPeriodRepository periods;
    @Autowired UserRepository users;
    @Autowired MutableClock clock;
    @Autowired jakarta.persistence.EntityManager em;

    User leader;

    @BeforeEach
    void seed() {
        fx.build();
        leader = users.save(User.create("lanhdao_qt", "Lãnh đạo", Role.LEADER, null, "x"));
        jdbc.update("update tariff_rates set collection_fee = 57000, transport_fee = 23000 where tariff_group = 'HH_3_PLUS'");
        collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000001"), 80_000, PaymentMethod.CASH, "p-1", null,
                null, null), fx.actor(fx.thu07));
        collection.recordBankTransfer(fx.chargeId("DTH-H000003"), 80_000, "FT001", "sepay-1");
        afterHouseholdDue();
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    @Test
    void settlementRecordsBothSidesAndMatchesLedger() throws Exception {
        String officer = fx.bearer(fx.officer);
        ledger(officer).andExpect(jsonPath("$[0].reconciliation").value("PENDING"))
                .andExpect(jsonPath("$[0].settlementCode").doesNotExist());

        issue(officer, fx.dv01.getId(), "TRANSFER")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("QT-1026-001"))
                .andExpect(jsonPath("$.companyOwes").value(23_000))
                .andExpect(jsonPath("$.communeOwes").value(57_000))
                .andExpect(jsonPath("$.amount").value(-34_000))
                .andExpect(jsonPath("$.amountInWords").value("Ba mươi tư nghìn đồng"))
                .andExpect(jsonPath("$.representativeName").value("Người Mẫu A"))
                .andExpect(jsonPath("$.settleDate").value("2026-11-01"));
        ledger(officer).andExpect(jsonPath("$[0].settlementCode").value("QT-1026-001"))
                .andExpect(jsonPath("$[0].communePaid").value(34_000))
                .andExpect(jsonPath("$[0].communeOwed").value(0))
                .andExpect(jsonPath("$[0].reconciliation").value("MATCHED"))
                .andExpect(jsonPath("$[0].progress").value("PAID_IN_FULL"));

        // Mỗi công ty mỗi kỳ một phiếu.
        issue(officer, fx.dv01.getId(), "TRANSFER").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SETTLEMENT_EXISTS"));
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'ISSUE_SETTLEMENT'", Integer.class))
                .isEqualTo(1);
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$.items[?(@.title == 'Xã đã lập phiếu quyết toán QT-1026-001')]", hasSize(1)));
    }

    @Test
    void zeroDifferenceStillNeedsASettlementWithoutMethod() throws Exception {
        // DV07 có khoản nhưng chưa thu gì: chênh lệch 0, vẫn phải quyết toán, không chọn hình thức.
        String officer = fx.bearer(fx.officer);
        mvc.perform(get("/api/remittance/ledger").param("periodId", fx.october.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$[1].companyCode").value("DV07")).andExpect(jsonPath("$[1].settled").value(false));
        issue(officer, fx.dv07.getId(), null).andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(0)).andExpect(jsonPath("$.method").doesNotExist());
        // Chênh lệch khác 0 thì phải chọn hình thức.
        issue(officer, fx.dv01.getId(), null).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("SETTLEMENT_METHOD_REQUIRED"));
    }

    @Test
    void onlyAfterHouseholdDueAndNotInTheFuture() throws Exception {
        clock.set(Instant.parse("2026-10-31T05:00:00Z"));
        issue(fx.bearer(fx.officer), fx.dv01.getId(), "CASH").andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("SETTLEMENT_TOO_EARLY"))
                .andExpect(jsonPath("$.message").value("Chỉ lập phiếu quyết toán sau hạn dân đóng (31/10/2026)."));
        afterHouseholdDue();
        mvc.perform(post("/api/remittance/settlements").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":%d,\"periodId\":%d,\"method\":\"CASH\",\"settleDate\":\"2026-11-02\"}"
                                .formatted(fx.dv01.getId(), fx.october.getId())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("SETTLEMENT_DATE_INVALID"));
    }

    @Test
    void overdueAfterSettlementDueButLateSettlementIsAllowed() throws Exception {
        clock.set(Instant.parse("2026-11-06T05:00:00Z"));
        String officer = fx.bearer(fx.officer);
        ledger(officer).andExpect(jsonPath("$[0].overdue").value(true))
                .andExpect(jsonPath("$[0].reconciliation").value("MISMATCH"));
        issue(officer, fx.dv01.getId(), "CASH").andExpect(status().isCreated());
        ledger(officer).andExpect(jsonPath("$[0].overdue").value(false))
                .andExpect(jsonPath("$[0].reconciliation").value("MATCHED"));
    }

    @Test
    void moneyAfterSettlementGoesToTheNextCollectingPeriod() throws Exception {
        issue(fx.bearer(fx.officer), fx.dv01.getId(), "CASH").andExpect(status().isCreated());

        // Chưa có kỳ đang thu khác: chưa ghi được.
        assertThatThrownBy(() -> collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000002"), 80_000,
                PaymentMethod.CASH, "p-late", null, null, null), fx.actor(fx.thu07)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("công ty đã quyết toán");

        CollectionPeriod november = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null,
                LocalDate.of(2026, 11, 25), fx.october.getTariffVersion()));
        collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000002"), 80_000, PaymentMethod.CASH, "p-late2",
                null, null, null), fx.actor(fx.thu07));
        assertThat(jdbc.queryForObject("select ledger_period_id from payments where client_request_id = 'p-late2'",
                Long.class)).isEqualTo(november.getId());
        // Số kỳ 10 đã chốt không đổi, vẫn Khớp. DV07 chưa quyết toán vẫn ghi vào kỳ 10.
        ledger(fx.bearer(fx.officer)).andExpect(jsonPath("$[0].collected").value(160_000))
                .andExpect(jsonPath("$[0].reconciliation").value("MATCHED"));
        collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000005"), 80_000, PaymentMethod.CASH, "p-dv07",
                null, null, null), fx.actor(fx.thu12));
        assertThat(jdbc.queryForObject("select ledger_period_id from payments where client_request_id = 'p-dv07'",
                Long.class)).isNull();
    }

    @Test
    void rolesAndVisibility() throws Exception {
        issue(fx.bearer(fx.admin), fx.dv01.getId(), "CASH").andExpect(status().isForbidden());
        issue(fx.bearer(fx.thu07), fx.dv01.getId(), "CASH").andExpect(status().isForbidden());
        issue(fx.bearer(fx.dv01Manager), fx.dv01.getId(), "CASH").andExpect(status().isForbidden());
        issue(fx.bearer(leader), fx.dv01.getId(), "CASH").andExpect(status().isForbidden());
        issue(fx.bearer(fx.officer), fx.dv01.getId(), "CASH").andExpect(status().isCreated());

        list(fx.officer).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        list(leader).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        list(fx.dv01Manager).andExpect(status().isOk()).andExpect(jsonPath("$[0].companyCode").value("DV01"));
        list(fx.dv07Manager).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
        list(fx.admin).andExpect(status().isForbidden());
        list(fx.thu07).andExpect(status().isForbidden());

        long id = jdbc.queryForObject("select id from settlements", Long.class);
        mvc.perform(get("/api/remittance/settlements/" + id).header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv07Manager)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/remittance/settlements/" + id).header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("QT-1026-001"));
    }

    @Test
    void lockedPeriodIsRejected() throws Exception {
        jdbc.update("update collection_periods set status = 'LOCKED', locked_at = now() where id = ?", fx.october.getId());
        em.clear();
        issue(fx.bearer(fx.officer), fx.dv01.getId(), "CASH").andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
    }

    /** 01/11/2026: qua hạn dân đóng 31/10, chưa tới hạn quyết toán 05/11. */
    private void afterHouseholdDue() {
        clock.set(Instant.parse("2026-11-01T05:00:00Z"));
    }

    private ResultActions issue(String token, Long companyId, String method) throws Exception {
        return mvc.perform(post("/api/remittance/settlements").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyId\":%d,\"periodId\":%d%s}".formatted(companyId, fx.october.getId(),
                        method == null ? "" : ",\"method\":\"" + method + "\"")));
    }

    private ResultActions list(User user) throws Exception {
        return mvc.perform(get("/api/remittance/settlements").param("periodId", fx.october.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(user)));
    }

    private ResultActions ledger(String token) throws Exception {
        return mvc.perform(get("/api/remittance/ledger").param("periodId", fx.october.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, token));
    }
}
