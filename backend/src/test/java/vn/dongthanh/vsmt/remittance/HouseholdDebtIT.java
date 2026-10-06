package vn.dongthanh.vsmt.remittance;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueCommand;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * Công nợ hộ (UC-32): khoản Chưa thu của kỳ đã khóa, không có bảng riêng. Kỳ 10/2026 có 6 hộ: DV01 có DTH-H000001..4
 * (KV07: 1, 2; KV09: 3, 4), DV07 có DTH-H000005..6 (KV12).
 */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class HouseholdDebtIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;
    @Autowired CollectionFixture fx;
    @Autowired CollectionService collection;
    @Autowired CollectionPeriodRepository periods;
    @Autowired ChargeRequestService chargeRequests;
    @Autowired UserRepository users;

    User leader;

    @BeforeEach
    void seed() {
        fx.build();
        leader = users.save(User.create("leader_fx", "Lãnh đạo xã", Role.LEADER, null, "x"));
    }

    @Test
    void openPeriodChargesAreNotDebt() throws Exception {
        debts(fx.officer, "")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.householdCount").value(0))
                .andExpect(jsonPath("$.totalAmount").value(0))
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void unpaidChargesOfALockedPeriodAreDebtAndPayingInTheNextPeriodClearsThem() throws Exception {
        fx.collectCash("DTH-H000001");
        lockOctober();

        // 5 hộ chưa đóng; DTH-H000001 đã đóng đủ nên không nợ.
        debts(fx.officer, "")
                .andExpect(jsonPath("$.householdCount").value(5))
                .andExpect(jsonPath("$.total").value(5))
                .andExpect(jsonPath("$.totalAmount").value(400_000))
                .andExpect(jsonPath("$.items[*].subjectCode",
                        contains("DTH-H000002", "DTH-H000003", "DTH-H000004", "DTH-H000005", "DTH-H000006")))
                .andExpect(jsonPath("$.items[0].periodLabel").value("Tháng 10/2026"))
                .andExpect(jsonPath("$.items[0].areaCode").value("KV07"))
                .andExpect(jsonPath("$.items[0].companyCode").value("DV01"))
                .andExpect(jsonPath("$.items[0].amount").value(80_000))
                .andExpect(jsonPath("$.items[0].debtPeriods").value(1));

        // Lọc theo công ty và theo tổ; tổng số hộ theo bộ lọc.
        debts(fx.officer, "?companyId=" + fx.dv07.getId())
                .andExpect(jsonPath("$.householdCount").value(2)).andExpect(jsonPath("$.totalAmount").value(160_000));
        debts(fx.officer, "?areaId=" + fx.kv09.getId())
                .andExpect(jsonPath("$.householdCount").value(2))
                .andExpect(jsonPath("$.items[*].subjectCode", contains("DTH-H000003", "DTH-H000004")));
        // Phân trang: tổng không đổi, trang 2 (size 2) còn 2 dòng.
        debts(fx.officer, "?page=1&size=2")
                .andExpect(jsonPath("$.householdCount").value(5))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].subjectCode").value("DTH-H000004"));

        // Hộ DTH-H000002 nộp ở kỳ 11 (đang thu): hết nợ.
        periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null, LocalDate.of(2026, 11, 30),
                fx.october.getTariffVersion()));
        collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000002"), 80_000, PaymentMethod.CASH, "debt-1", null,
                null, null), fx.actor(fx.thu07));
        em.flush();
        debts(fx.officer, "")
                .andExpect(jsonPath("$.householdCount").value(4))
                .andExpect(jsonPath("$.totalAmount").value(320_000))
                .andExpect(jsonPath("$.items[*].subjectCode", contains("DTH-H000003", "DTH-H000004", "DTH-H000005", "DTH-H000006")));
    }

    @Test
    void debtCollectedInTheOpenPeriodIsExposedOnTheLedgerRowAndAreaProgressCountsDebtHouseholds() throws Exception {
        lockOctober();
        CollectionPeriod november = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null,
                LocalDate.of(2026, 11, 30), fx.october.getTariffVersion()));
        collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000001"), 80_000, PaymentMethod.CASH, "debt-2", null,
                null, null), fx.actor(fx.thu07));
        em.flush();

        // Kỳ 11: DV01 thu 80.000 công nợ kỳ cũ (đã thu 80.000, trong đó công nợ 80.000); kỳ 10 không có thu công nợ.
        ledger(november)
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].collected").value(contains(80_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].debtCollected").value(contains(80_000)))
                // Công nợ tháng trước: kỳ 10 DV01 nợ 4 × 80.000, H1 vừa đóng nên còn 240.000; DV07 còn 2 hộ.
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].lastPeriodDebt").value(contains(240_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].lastPeriodDebt").value(contains(160_000)));
        ledger(fx.october)
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].debtCollected").value(contains(0)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].lastPeriodDebt").value(contains(0)));

        // Đếm hộ còn nợ kỳ liền trước (kỳ 10) theo tổ ở kỳ 11: KV07 còn H2 (H1 đã nộp), KV09 còn 2, KV12 còn 2.
        mvc.perform(get("/api/remittance/area-progress").param("periodId", november.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(jsonPath("$[?(@.areaCode == 'KV07')].debtHouseholds").value(contains(1)))
                .andExpect(jsonPath("$[?(@.areaCode == 'KV09')].debtHouseholds").value(contains(2)))
                .andExpect(jsonPath("$[?(@.areaCode == 'KV12')].debtHouseholds").value(contains(2)));
    }

    @Test
    void aHouseholdOwingTwoLockedPeriodsCountsOnceButShowsBothPeriods() throws Exception {
        CollectionPeriod september = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 9, null,
                LocalDate.of(2026, 9, 30), fx.october.getTariffVersion()));
        chargeRequests.publish(new IssueCommand(september.getId(), fx.env.getId(), ChargeScope.ALL, null, null, null, null),
                fx.actor(fx.officer));
        em.flush();
        jdbc.update("update collection_periods set status = 'LOCKED', locked_at = now() where id = ?", september.getId());
        lockOctober();

        debts(fx.officer, "")
                .andExpect(jsonPath("$.householdCount").value(6))
                .andExpect(jsonPath("$.total").value(12))
                .andExpect(jsonPath("$.totalAmount").value(960_000))
                // Kỳ cũ trước: 9/2026 rồi 10/2026; mỗi hộ nợ 2 kỳ.
                .andExpect(jsonPath("$.items[0].periodLabel").value("Tháng 09/2026"))
                .andExpect(jsonPath("$.items[0].debtPeriods").value(2));
        mvc.perform(get("/api/remittance/area-progress").param("periodId", fx.october.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(jsonPath("$[?(@.areaCode == 'KV07')].debtHouseholds").value(contains(2)));
    }

    @Test
    void previousOfShowsOnlyTheDebtOfTheImmediatelyPreviousPeriodEvenWhenItIsNotLocked() throws Exception {
        fx.collectCash("DTH-H000001"); // trước khi có kỳ 9 để mỗi hộ chỉ một khoản khi tra
        CollectionPeriod september = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 9, null,
                LocalDate.of(2026, 9, 30), fx.october.getTariffVersion()));
        chargeRequests.publish(new IssueCommand(september.getId(), fx.env.getId(), ChargeScope.ALL, null, null, null, null),
                fx.actor(fx.officer));
        em.flush();
        jdbc.update("update collection_periods set status = 'LOCKED', locked_at = now() where id = ?", september.getId());
        CollectionPeriod november = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null,
                LocalDate.of(2026, 11, 30), fx.october.getTariffVersion()));
        em.flush();

        // Xem kỳ 11: chỉ nợ kỳ 10 (chưa khóa), không gồm nợ kỳ 9; H1 đã đóng kỳ 10 nên còn 5 hộ.
        debts(fx.officer, "?previousOf=" + november.getId())
                .andExpect(jsonPath("$.householdCount").value(5))
                .andExpect(jsonPath("$.totalAmount").value(400_000))
                .andExpect(jsonPath("$.items[0].periodLabel").value("Tháng 10/2026"))
                // H2 nợ cả kỳ 9 (đã khóa) và kỳ 10: số kỳ nợ là 2.
                .andExpect(jsonPath("$.items[0].subjectCode").value("DTH-H000002"))
                .andExpect(jsonPath("$.items[0].debtPeriods").value(2));
        // Xem kỳ 10: nợ kỳ 9 của cả 6 hộ.
        debts(fx.officer, "?previousOf=" + fx.october.getId())
                .andExpect(jsonPath("$.householdCount").value(6))
                .andExpect(jsonPath("$.items[0].periodLabel").value("Tháng 09/2026"));
        // Kỳ đầu tiên không có kỳ trước: không nợ.
        debts(fx.officer, "?previousOf=" + september.getId()).andExpect(jsonPath("$.householdCount").value(0));
    }

    @Test
    void onlyCommuneOfficerAndLeaderMayRead() throws Exception {
        debts(fx.officer, "").andExpect(status().isOk());
        debts(leader, "").andExpect(status().isOk());
        debts(fx.admin, "").andExpect(status().isForbidden());
        debts(fx.dv01Manager, "").andExpect(status().isForbidden());
        debts(fx.thu07, "").andExpect(status().isForbidden());
        mvc.perform(get("/api/remittance/household-debts")).andExpect(status().isUnauthorized());
    }

    private void lockOctober() {
        em.flush();
        jdbc.update("update collection_periods set status = 'LOCKED', locked_at = now() where id = ?", fx.october.getId());
        em.clear();
    }

    private ResultActions debts(User user, String query) throws Exception {
        return mvc.perform(get("/api/remittance/household-debts" + query).header(HttpHeaders.AUTHORIZATION, fx.bearer(user)));
    }

    private ResultActions ledger(CollectionPeriod period) throws Exception {
        return mvc.perform(get("/api/remittance/ledger").param("periodId", period.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)));
    }
}
