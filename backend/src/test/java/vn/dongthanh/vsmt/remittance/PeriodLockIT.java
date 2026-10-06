package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
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
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;
import vn.dongthanh.vsmt.support.MutableClock;

/**
 * Khóa kỳ (UC-39, góp ý BA 05/10). Kỳ 10/2026 có hạn nộp 31/10/2026; "hôm nay" mặc định 01/10/2026. Điều kiện khóa: mọi
 * công ty đã nộp đủ phải nộp xã (tính trên đã thu) VÀ (kỳ đã thu đủ mọi khoản HOẶC đã đến hạn nộp).
 */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class PeriodLockIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired CompanyReceiptService receipts;
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
    void lockingWithDebtIs422ListingCompaniesAndAmounts() throws Exception {
        fx.collectAllCash();
        lock(fx.officer)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_HAS_DEBT"))
                .andExpect(jsonPath("$.message").value(allOf(containsString("DV01: 320.000 đ"),
                        containsString("DV07: 160.000 đ"))));
        lock(fx.admin).andExpect(status().isForbidden());
    }

    @Test
    void afterLockingNothingCanChangeThePeriod() throws Exception {
        fx.collectAllCash();
        remit(fx.dv01.getId(), 320_000);
        remit(fx.dv07.getId(), 160_000);
        lock(fx.officer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"))
                .andExpect(jsonPath("$.lockedAt").isNotEmpty());
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'LOCK_PERIOD'", Integer.class))
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
        post("/api/remittance/receipts", officer, """
                {"companyId":%d,"periodId":%d,"amount":1000,"method":"CASH"}"""
                .formatted(fx.dv01.getId(), fx.october.getId()))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
        lock(fx.officer).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_INVALID_TRANSITION"));
    }

    @Test
    void uncollectedChargesBlockLockingBeforeTheDueDateEvenWhenCompaniesPaidInFull() throws Exception {
        // Còn 1 hộ (DTH-H000006) chưa đóng, chưa đến hạn nộp 31/10: dù hai công ty đã nộp đủ phần đã thu vẫn không khóa được.
        collectAllButOneAndRemit();
        lock(fx.officer)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_NOT_DUE"))
                .andExpect(jsonPath("$.message").value(allOf(containsString("còn 1 khoản hộ chưa đóng"),
                        containsString("chưa đến hạn nộp (31/10/2026)"))));
        assertThat(periodStatus()).isEqualTo("COLLECTING");
    }

    @Test
    void onTheDueDateUncollectedChargesDoNotBlockAndBecomeHouseholdDebtPaidIntoTheNextPeriod() throws Exception {
        collectAllButOneAndRemit();
        clock.set(Instant.parse("2026-10-31T03:00:00Z"));
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

        // Kỳ 10 (đã khóa): đã thu, phải nộp xã, đã nộp không đổi (DV07: thu 80.000, nộp 80.000).
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
        post("/api/remittance/receipts", fx.bearer(fx.officer), """
                {"companyId":%d,"periodId":%d,"amount":80000,"method":"CASH"}"""
                .formatted(fx.dv07.getId(), november.getId())).andExpect(status().isCreated());

        // Kỳ đã khóa vẫn chặn sửa khoản và phiếu thu cũ.
        post("/api/remittance/receipts", fx.bearer(fx.officer), """
                {"companyId":%d,"periodId":%d,"amount":1000,"method":"CASH"}"""
                .formatted(fx.dv07.getId(), fx.october.getId()))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
        post("/api/billing/charge-requests", fx.bearer(fx.officer), """
                {"periodId":%d,"feeTypeId":%d,"scopeType":"ALL"}"""
                .formatted(fx.october.getId(), fx.env.getId()))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
    }

    @Test
    void companyDebtStillBlocksLockingAfterTheDueDate() throws Exception {
        fx.collectAllCash();
        clock.set(Instant.parse("2026-11-02T03:00:00Z"));
        // Hết hạn nộp và đã thu đủ, nhưng hai công ty chưa nộp: vẫn chặn.
        lock(fx.officer)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_HAS_DEBT"));
    }

    @Test
    void communeOwingACompanyBlocksLockingUntilItHasPaidInFull() throws Exception {
        // DV01 có 2 hộ chuyển khoản 160.000 vào tài khoản xã, không thu tiền mặt: phí thu gom của số đã thu (114.000) vượt tiền
        // mặt (0), phải nộp xã âm (xã trả lại công ty) nên không còn nợ xã, không chặn khóa kỳ khi đã đến hạn nộp.
        jdbc.update("update tariff_rates set collection_fee = 57000, transport_fee = 23000 where tariff_group = 'HH_3_PLUS'");
        collectionTransfer("DTH-H000001", "t-1");
        collectionTransfer("DTH-H000002", "t-2");
        clock.set(Instant.parse("2026-10-31T03:00:00Z"));
        ledger(fx.officer, fx.october.getId())
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].payable").value(contains(-114_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].remaining").value(contains(-114_000)));
        // Xã còn phải trả lại DV01 114.000 thì chặn khóa kỳ, nêu rõ lý do; trả đủ rồi mới khóa được (UC-39, UC-55).
        lock(fx.officer).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_COMMUNE_OWES"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("DV01: 114.000 đ")));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/remittance/payouts")
                        .header(org.springframework.http.HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":%d,\"periodId\":%d,\"amount\":114000,\"method\":\"TRANSFER\"}"
                                .formatted(fx.dv01.getId(), fx.october.getId())))
                .andExpect(status().isCreated());
        lock(fx.officer).andExpect(status().isOk());
    }

    private void collectionTransfer(String subject, String key) {
        collection.recordBankTransfer(fx.chargeId(subject), 80_000, "FT-" + key, key);
    }

    private void collectAllButOneAndRemit() {
        fx.collectCash("DTH-H000001", "DTH-H000002", "DTH-H000003", "DTH-H000004", "DTH-H000005");
        remit(fx.dv01.getId(), 320_000);
        remit(fx.dv07.getId(), 80_000);
    }

    private void remit(Long companyId, long amount) {
        receipts.issue(new IssueReceiptCommand(companyId, fx.october.getId(), amount, ReceiptMethod.TRANSFER,
                null, null, null, null), fx.actor(fx.officer));
    }

    private String periodStatus() {
        return jdbc.queryForObject("select status from collection_periods where id = ?", String.class,
                fx.october.getId());
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
