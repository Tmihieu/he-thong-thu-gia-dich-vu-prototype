package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.SettlementService;
import vn.dongthanh.vsmt.remittance.service.SettlementService.IssueSettlementCommand;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;
import vn.dongthanh.vsmt.support.MutableClock;

/**
 * Khóa kỳ (UC-39, 07/10). Kỳ 10/2026 hạn dân đóng 31/10/2026, hạn quyết toán 05/11; "hôm nay" mặc định 01/10/2026.
 * Điều kiện khóa: không còn chuyển khoản chưa xác định và mọi công ty có số liệu trong kỳ đã có phiếu quyết toán.
 */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class PeriodLockIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired SettlementService settlements;
    @Autowired CollectionPeriodRepository periods;
    @Autowired MutableClock clock;
    @Autowired CollectionService collection;
    @Autowired jakarta.persistence.EntityManager em;

    @BeforeEach
    void seed() {
        fx.build();
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    @Test
    void lockingBeforeEveryCompanySettledIs422ListingCompanies() throws Exception {
        fx.collectAllCash();
        lock(fx.officer)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_NOT_SETTLED"))
                .andExpect(jsonPath("$.message").value("Chưa khóa được kỳ 2026-10 vì còn 2 công ty chưa quyết toán: DV01, DV07."));
        lock(fx.admin).andExpect(status().isForbidden());

        // Một công ty quyết toán vẫn chặn vì công ty kia.
        afterHouseholdDue();
        settle(fx.dv01.getId());
        lock(fx.officer).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(containsString("1 công ty chưa quyết toán: DV07")));
    }

    @Test
    void afterLockingNothingCanChangeThePeriod() throws Exception {
        fx.collectAllCash();
        afterHouseholdDue();
        settle(fx.dv01.getId());
        settle(fx.dv07.getId());
        lock(fx.officer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"))
                .andExpect(jsonPath("$.lockedAt").isNotEmpty());
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'LOCK_PERIOD' and entity_id = ?", Integer.class, fx.october.getCode()))
                .isEqualTo(1);

        String officer = fx.bearer(fx.officer);
        post("/api/billing/charge-requests", officer, """
                {"periodId":%d,"feeTypeId":%d,"scopeType":"ALL"}"""
                .formatted(fx.october.getId(), fx.env.getId()))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
        // Khoản đã đóng đủ, và chưa có kỳ đang thu để ghi nhận tiền công nợ: không ghi thêm được gì.
        post("/api/collection/payments", fx.bearer(fx.thu07), """
                {"chargeId":%d,"amount":80000,"method":"CASH","clientRequestId":"after-lock"}"""
                .formatted(fx.chargeId("DTH-H000001")))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("NO_COLLECTING_PERIOD"));
        post("/api/remittance/settlements", officer, """
                {"companyId":%d,"periodId":%d,"method":"CASH"}"""
                .formatted(fx.dv01.getId(), fx.october.getId()))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
        lock(fx.officer).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_INVALID_TRANSITION"));
    }

    @Test
    void uncollectedChargesDoNotBlockAndBecomeHouseholdDebtPaidIntoTheNextPeriod() throws Exception {
        collectAllButOneAndSettle();
        lock(fx.officer).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("LOCKED"));

        // Công nợ của hộ: khoản Chưa thu của kỳ đã khóa. Chưa có kỳ đang thu thì chưa nộp được.
        long debtCharge = fx.chargeId("DTH-H000006");
        assertThat(jdbc.queryForObject("select status from charges where id = ?", String.class, debtCharge)).isEqualTo("UNPAID");
        pay(debtCharge, "debt-1").andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("NO_COLLECTING_PERIOD"));

        // Kỳ 11/2026 đang thu: hộ nộp công nợ kỳ 10, tiền ghi vào kỳ 11, kỳ 10 giữ nguyên số.
        CollectionPeriod november = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null,
                LocalDate.of(2026, 11, 30), fx.october.getTariffVersion()));
        pay(debtCharge, "debt-2").andExpect(status().isCreated());
        em.flush();
        assertThat(jdbc.queryForObject("select status from charges where id = ?", String.class, debtCharge)).isEqualTo("PAID");
        assertThat(jdbc.queryForObject("select ledger_period_id from payments where charge_id = ?", Long.class, debtCharge))
                .isEqualTo(november.getId());

        // Kỳ 10 (đã khóa): đã thu, phải nộp xã, đã nộp không đổi (DV07: thu 80.000, quyết toán nộp 80.000).
        ledger(fx.officer, fx.october.getId())
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].collected").value(contains(80_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].payable").value(contains(80_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].remaining").value(contains(0)));
        // Kỳ 11 (đang thu): khoản của kỳ 10 nhưng tiền tính vào đây, DV07 phải nộp 80.000 trên số đã thu đó.
        ledger(fx.officer, november.getId())
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].due").value(contains(0)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].collected").value(contains(80_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].cashCollected").value(contains(80_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].payable").value(contains(80_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].remaining").value(contains(80_000)));

        post("/api/billing/charge-requests", fx.bearer(fx.officer), """
                {"periodId":%d,"feeTypeId":%d,"scopeType":"ALL"}"""
                .formatted(fx.october.getId(), fx.env.getId()))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
    }

    @Test
    void negativeDifferenceAlsoNeedsASettlementBeforeLocking() throws Exception {
        // DV01 có 2 hộ chuyển khoản 160.000 vào tài khoản xã, không thu tiền mặt: chênh lệch −114.000 (xã trả công ty).
        jdbc.update("update tariff_rates set collection_fee = 57000, transport_fee = 23000 where tariff_group = 'HH_3_PLUS'");
        collectionTransfer("DTH-H000001", "t-1");
        collectionTransfer("DTH-H000002", "t-2");
        afterHouseholdDue();
        ledger(fx.officer, fx.october.getId())
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].payable").value(contains(-114_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].communeOwed").value(contains(114_000)));
        lock(fx.officer).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_NOT_SETTLED"));
        settle(fx.dv01.getId());
        settle(fx.dv07.getId());
        ledger(fx.officer, fx.october.getId())
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].communePaid").value(contains(114_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].communeOwed").value(contains(0)));
        lock(fx.officer).andExpect(status().isOk());
    }

    private void collectionTransfer(String subject, String key) {
        collection.recordBankTransfer(fx.chargeId(subject), 80_000, "FT-" + key, key);
    }

    /** Thu tiền mặt 5 hộ (trừ DTH-H000006), qua hạn dân đóng rồi hai công ty quyết toán: DV01 nộp 320.000, DV07 80.000. */
    private void collectAllButOneAndSettle() {
        fx.collectCash("DTH-H000001", "DTH-H000002", "DTH-H000003", "DTH-H000004", "DTH-H000005");
        afterHouseholdDue();
        settle(fx.dv01.getId());
        settle(fx.dv07.getId());
    }

    /** 01/11/2026: qua hạn dân đóng 31/10. */
    private void afterHouseholdDue() {
        clock.set(Instant.parse("2026-11-01T03:00:00Z"));
    }

    private void settle(Long companyId) {
        settlements.issue(new IssueSettlementCommand(companyId, fx.october.getId(), ReceiptMethod.TRANSFER, null, null,
                null, null), fx.actor(fx.officer));
    }

    private ResultActions pay(long chargeId, String requestId) throws Exception {
        return post("/api/collection/payments", fx.bearer(fx.thu12), """
                {"chargeId":%d,"amount":80000,"method":"CASH","clientRequestId":"%s"}"""
                .formatted(chargeId, requestId));
    }

    private ResultActions ledger(User user, Long periodId) throws Exception {
        return mvc.perform(get("/api/remittance/ledger").param("periodId", periodId.toString())
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(user)));
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
