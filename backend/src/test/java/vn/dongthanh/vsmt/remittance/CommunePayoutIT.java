package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
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
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** UC-55: DV01 có phải nộp xã âm (−34.000) nên xã trả lại công ty; số tiền, ngày, nhiều lần, quyền, sổ công ty–kỳ. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CommunePayoutIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired CollectionService collection;
    @Autowired UserRepository users;
    @Autowired jakarta.persistence.EntityManager em;

    User leader;

    @BeforeEach
    void seed() {
        fx.build();
        leader = users.save(User.create("lanhdao_pc", "Lãnh đạo", Role.LEADER, null, "x"));
        // Đã thu 160.000 (tiền mặt 80.000 + chuyển khoản 80.000), phí thu gom 114.000: phải nộp xã = −34.000.
        jdbc.update("update tariff_rates set collection_fee = 57000, transport_fee = 23000 where tariff_group = 'HH_3_PLUS'");
        collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000001"), 80_000, PaymentMethod.CASH, "p-1", null,
                null, null), fx.actor(fx.thu07));
        collection.recordBankTransfer(fx.chargeId("DTH-H000003"), 80_000, "FT001", "sepay-1");
    }

    @Test
    void payoutsAccumulateAndLedgerShowsPaidAndOwed() throws Exception {
        String officer = fx.bearer(fx.officer);
        ledger(officer).andExpect(jsonPath("$[0].communePaid").value(0)).andExpect(jsonPath("$[0].communeOwed").value(34_000))
                .andExpect(jsonPath("$[0].reconciliation").value("PENDING"));

        issue(officer, 20_000, null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("PC-CT-1026-001"))
                .andExpect(jsonPath("$.amountInWords").value("Hai mươi nghìn đồng"))
                .andExpect(jsonPath("$.cumulativePaid").value(20_000))
                .andExpect(jsonPath("$.periodOwed").value(34_000))
                .andExpect(jsonPath("$.remainingAfter").value(14_000));
        ledger(officer).andExpect(jsonPath("$[0].communePaid").value(20_000)).andExpect(jsonPath("$[0].communeOwed").value(14_000))
                // Còn phải nộp giữ nguyên âm: phiếu chi không đổi số xã phải trả theo công thức, chỉ ghi việc đã trả.
                .andExpect(jsonPath("$[0].remaining").value(-34_000));

        issue(officer, 14_001, null).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYOUT_AMOUNT_OUT_OF_RANGE"))
                .andExpect(jsonPath("$.message").value(containsString("14.000 đ")));
        issue(officer, 14_000, "Trả nốt")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("PC-CT-1026-002"))
                .andExpect(jsonPath("$.cumulativePaid").value(34_000))
                .andExpect(jsonPath("$.remainingAfter").value(0));
        ledger(officer).andExpect(jsonPath("$[0].communeOwed").value(0)).andExpect(jsonPath("$[0].reconciliation").value("MATCHED"));

        issue(officer, 1, null).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYOUT_AMOUNT_OUT_OF_RANGE"));
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'ISSUE_COMMUNE_PAYOUT'",
                Integer.class)).isEqualTo(2);
    }

    @Test
    void futureDateZeroAmountAndCompanyWithoutOwedAreRejected() throws Exception {
        String officer = fx.bearer(fx.officer);
        mvc.perform(post("/api/remittance/payouts").header(HttpHeaders.AUTHORIZATION, officer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":%d,\"periodId\":%d,\"amount\":1000,\"payoutDate\":\"2026-12-31\"}"
                                .formatted(fx.dv01.getId(), fx.october.getId())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYOUT_DATE_INVALID"));
        issue(officer, 0, null).andExpect(status().isBadRequest());
        // DV07 không có số xã phải trả.
        mvc.perform(post("/api/remittance/payouts").header(HttpHeaders.AUTHORIZATION, officer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":%d,\"periodId\":%d,\"amount\":1000}".formatted(fx.dv07.getId(), fx.october.getId())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYOUT_AMOUNT_OUT_OF_RANGE"));
    }

    @Test
    void rolesAndVisibility() throws Exception {
        issue(fx.bearer(fx.officer), 10_000, null).andExpect(status().isCreated());

        issue(fx.bearer(fx.admin), 1_000, null).andExpect(status().isForbidden());
        issue(fx.bearer(fx.thu07), 1_000, null).andExpect(status().isForbidden());
        issue(fx.bearer(fx.dv01Manager), 1_000, null).andExpect(status().isForbidden());
        issue(fx.bearer(leader), 1_000, null).andExpect(status().isForbidden());

        list(fx.officer).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        list(leader).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        list(fx.dv01Manager).andExpect(status().isOk()).andExpect(jsonPath("$[0].companyCode").value("DV01"));
        list(fx.dv07Manager).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
        list(fx.admin).andExpect(status().isForbidden());
        list(fx.thu07).andExpect(status().isForbidden());

        long id = jdbc.queryForObject("select id from commune_payouts", Long.class);
        mvc.perform(get("/api/remittance/payouts/" + id).header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv07Manager)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/remittance/payouts/" + id).header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("PC-CT-1026-001"));

        // Công ty nhận thông báo; công ty khác không.
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$.items[?(@.title == 'Xã đã lập phiếu chi trả PC-CT-1026-001')]", hasSize(1)));
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv07Manager)))
                .andExpect(jsonPath("$.items[?(@.title == 'Xã đã lập phiếu chi trả PC-CT-1026-001')]", hasSize(0)));
    }

    @Test
    void lockedPeriodIsRejected() throws Exception {
        jdbc.update("update collection_periods set status = 'LOCKED', locked_at = now() where id = ?", fx.october.getId());
        em.clear();
        issue(fx.bearer(fx.officer), 1_000, null).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
    }

    private ResultActions issue(String token, long amount, String note) throws Exception {
        return mvc.perform(post("/api/remittance/payouts").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyId\":%d,\"periodId\":%d,\"amount\":%d%s}".formatted(fx.dv01.getId(), fx.october.getId(),
                        amount, note == null ? "" : ",\"note\":\"" + note + "\"")));
    }

    private ResultActions list(User user) throws Exception {
        return mvc.perform(get("/api/remittance/payouts").param("periodId", fx.october.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(user)));
    }

    private ResultActions ledger(String token) throws Exception {
        return mvc.perform(get("/api/remittance/ledger").param("periodId", fx.october.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, token));
    }
}
