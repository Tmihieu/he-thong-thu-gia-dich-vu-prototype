package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.remittance.service.AreaProgressService.AreaProgress;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService.LedgerRow;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyPeriodAmount;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Progress;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Reconciliation;
import vn.dongthanh.vsmt.remittance.service.RemittedTotals;

/** Viết trước (TDD) cho T24: công thức R6–R14 và mỗi nhánh trạng thái. */
class CompanyLedgerServiceTest {

    final LedgerQueries queries = mock(LedgerQueries.class);
    final RemittedTotals remitted = mock(RemittedTotals.class);
    final CollectionPeriodRepository periods = mock(CollectionPeriodRepository.class);
    final CompanyRepository companies = mock(CompanyRepository.class);

    final TariffVersion bg = TariffVersion.create("BG", "QĐ", LocalDate.of(2026, 1, 1), null, TariffStatus.ACTIVE);
    final CollectionPeriod sept = period(PeriodType.MONTH, 9, "2026-09-30", 9L);
    final CollectionPeriod oct = period(PeriodType.MONTH, 10, "2026-10-31", 10L);
    final Company dv01 = company("DV01", 1L);
    final Company dv03 = company("DV03", 3L);

    CompanyLedgerService service(String today) {
        Clock clock = Clock.fixed(Instant.parse(today + "T05:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        return new CompanyLedgerService(queries, remitted, periods, companies, clock);
    }

    @BeforeEach
    void setUp() {
        when(periods.findById(9L)).thenReturn(Optional.of(sept));
        when(periods.findById(10L)).thenReturn(Optional.of(oct));
        when(companies.findAllById(any())).thenReturn(List.of(dv01, dv03));
        when(queries.dueByCompany(anyLong())).thenReturn(List.of());
        when(queries.collectedByCompany(anyLong())).thenReturn(List.of());
        when(queries.dueByCompanyAndPeriodBefore(any())).thenReturn(List.of());
        when(remitted.receivedByCompany(anyLong())).thenReturn(Map.of());
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of());
    }

    void due(long periodId, long companyId, long amount, long count) {
        when(queries.dueByCompany(periodId)).thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, amount, count)));
    }

    @Test
    void dueCollectedReceivedAndRemainingPerCompany() {
        when(queries.dueByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 1_600_000, 20),
                new LedgerQueries.CompanyAmount(3L, 800_000, 10)));
        when(queries.collectedByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 1_200_000, 15)));
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(1_000_000, 1)));

        List<LedgerRow> rows = service("2026-10-15").ledger(10L);

        assertThat(rows).extracting(LedgerRow::companyCode).containsExactly("DV01", "DV03");
        LedgerRow r = rows.get(0);
        assertThat(r.due()).isEqualTo(1_600_000);
        assertThat(r.chargeCount()).isEqualTo(20);
        assertThat(r.collected()).isEqualTo(1_200_000);
        assertThat(r.received()).isEqualTo(1_000_000);
        assertThat(r.receiptCount()).isEqualTo(1);
        assertThat(r.remaining()).isEqualTo(600_000);
        assertThat(r.gap()).isEqualTo(-200_000);
        assertThat(r.collectionRate()).isEqualTo(75.0);
        assertThat(r.lowCollectionRate()).isFalse();
        assertThat(rows.get(1).collectionRate()).isZero();
        assertThat(rows.get(1).lowCollectionRate()).isTrue();
        assertThat(r.remittedRate()).isEqualTo(62.5);
        assertThat(r.lowRemittedRate()).isFalse();
        assertThat(rows.get(1).remittedRate()).isZero();
        assertThat(rows.get(1).lowRemittedRate()).isTrue();
    }

    @Test
    void companyFlagFollowsRemittedAndRatesAreComparedExactlyNotAfterRounding() {
        // Công ty đã thu 75% nhưng mới nộp 359.999 / 800.000 = 44,9999% (hiện "45,0"): cờ công ty bật theo đã nộp.
        due(10L, 1L, 800_000, 10);
        when(queries.collectedByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 600_000, 8)));
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(359_999, 1)));
        LedgerRow row = service("2026-10-15").row(1L, 10L);
        assertThat(row.collectionRate()).isEqualTo(75.0);
        assertThat(row.lowCollectionRate()).isFalse();
        assertThat(row.remittedRate()).isEqualTo(45.0);
        assertThat(row.lowRemittedRate()).isTrue();

        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(360_000, 1)));
        assertThat(service("2026-10-15").row(1L, 10L).lowRemittedRate()).isFalse();
        when(queries.collectedByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 359_999, 5)));
        assertThat(service("2026-10-15").row(1L, 10L).lowCollectionRate()).isTrue();

        // Cấp tổ vẫn theo đã thu / phải thu.
        assertThat(new AreaProgress(null, null, 800_000, 359_999, 10, 5, 0, 10).lowCollectionRate()).isTrue();
        assertThat(new AreaProgress(null, null, 800_000, 360_000, 10, 5, 0, 10).lowCollectionRate()).isFalse();
        assertThat(new AreaProgress(null, null, 0, 0, 0, 0, 0, 10).lowCollectionRate()).isFalse();
    }

    @Test
    void retainedPercentReducesPayableAndKeepsReconciliationMatched() {
        // Công ty thu 1.000.000, giữ 10% (100.000), nộp 900.000: nộp đủ, đối soát khớp, tỷ lệ nộp tính trên phần phải nộp.
        ReflectionTestUtils.setField(dv01, "retainedPercent", new java.math.BigDecimal("10"));
        due(10L, 1L, 1_000_000, 10);
        when(queries.collectedByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 1_000_000, 10)));
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(900_000, 1)));
        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.retained()).isEqualTo(100_000);
        assertThat(r.payable()).isEqualTo(900_000);
        assertThat(r.remaining()).isZero();
        assertThat(r.progress()).isEqualTo(Progress.PAID_IN_FULL);
        assertThat(r.reconciliation()).isEqualTo(Reconciliation.MATCHED);
        assertThat(r.gap()).isZero();

        // Mới nộp 450.000: còn phải nộp 450.000, tỷ lệ nộp = 450.000 / (1.000.000 − 100.000) = 50%.
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(450_000, 1)));
        LedgerRow half = service("2026-10-15").row(1L, 10L);
        assertThat(half.remaining()).isEqualTo(450_000);
        assertThat(half.remittedRate()).isEqualTo(50.0);
    }

    @Test
    void noRetainedPercentMeansPayableEqualsDueAndRoundsToDong() {
        due(10L, 1L, 1_000_000, 10);
        LedgerRow r = service("2026-10-15").row(1L, 10L);
        assertThat(r.retained()).isZero();
        assertThat(r.payable()).isEqualTo(1_000_000);

        assertThat(CompanyLedgerService.retained(new java.math.BigDecimal("33.33"), 100)).isEqualTo(33);
        assertThat(CompanyLedgerService.retained(new java.math.BigDecimal("33.33"), 1_000)).isEqualTo(333);
        assertThat(CompanyLedgerService.retained(null, 1_000)).isZero();
    }

    @Test
    void retainedPercentAlsoAppliesToPreviousDebt() {
        // Kỳ 9 phải thu 1.000.000, giữ 10%, nộp 900.000: không còn nợ kỳ trước. Nộp 800.000: nợ 100.000.
        ReflectionTestUtils.setField(dv01, "retainedPercent", new java.math.BigDecimal("10"));
        when(companies.findAll()).thenReturn(List.of(dv01));
        when(periods.findAllById(any())).thenReturn(List.of(sept));
        when(queries.dueByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 1_000_000)));
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 900_000)));
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).isEmpty();

        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 800_000)));
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).singleElement().satisfies(d -> assertThat(d.remaining()).isEqualTo(100_000));
    }

    @Test
    void progressStatusBranches() {
        // Chưa nộp: chưa có phiếu thu, chưa quá hạn.
        due(10L, 1L, 800_000, 10);
        assertThat(service("2026-10-15").row(1L, 10L).progress()).isEqualTo(Progress.NOT_PAID);

        // Nộp một phần.
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(300_000, 1)));
        assertThat(service("2026-10-15").row(1L, 10L).progress()).isEqualTo(Progress.PARTIAL);

        // Quá hạn nộp: hết hạn kỳ mà còn phải nộp.
        LedgerRow late = service("2026-11-02").row(1L, 10L);
        assertThat(late.progress()).isEqualTo(Progress.OVERDUE);
        assertThat(late.overdue()).isTrue();

        // Đã nộp đủ.
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(800_000, 2)));
        assertThat(service("2026-11-02").row(1L, 10L).progress()).isEqualTo(Progress.PAID_IN_FULL);
    }

    @Test
    void previousPeriodDebtMakesProgressOverdueAndIsSummed() {
        due(10L, 1L, 800_000, 10);
        when(queries.dueByCompanyAndPeriodBefore(any())).thenReturn(List.of(
                new CompanyPeriodAmount(1L, 9L, 500_000), new CompanyPeriodAmount(3L, 9L, 400_000)));
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 200_000)));

        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.previousDebt()).isEqualTo(300_000);
        assertThat(r.progress()).isEqualTo(Progress.OVERDUE);
        assertThat(r.overdue()).isFalse();
        assertThat(r.reconciliation()).isEqualTo(Reconciliation.MISMATCH);
    }

    @Test
    void previousDebtIgnoresOverpaidPeriodsAndTheCurrentPeriod() {
        due(10L, 1L, 800_000, 10);
        when(queries.dueByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 500_000)));
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 600_000),
                new CompanyPeriodAmount(1L, 10L, 100_000)));

        assertThat(service("2026-10-15").row(1L, 10L).previousDebt()).isZero();
    }

    @Test
    void reconciliationBranches() {
        due(10L, 1L, 800_000, 10);
        // Đang nộp: trong hạn, đã thu nhưng chưa nộp hết.
        when(queries.collectedByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 800_000, 10)));
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(500_000, 1)));
        assertThat(service("2026-10-15").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.PENDING);

        // Lệch: hết hạn mà vẫn thu rồi chưa nộp.
        assertThat(service("2026-11-02").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.MISMATCH);

        // Khớp: nộp đủ, bằng số đã thu.
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(800_000, 2)));
        assertThat(service("2026-11-02").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.MATCHED);
    }

    @Test
    void companyChangeBetweenPeriodsKeepsOldPeriodOnOldCompany() {
        // Kỳ 09: khoản chụp DV03; kỳ 10: tổ đã chuyển sang DV01, khoản mới chụp DV01.
        when(queries.dueByCompany(9L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(3L, 160_000, 2)));
        when(queries.dueByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 160_000, 2)));

        assertThat(service("2026-10-15").ledger(9L)).singleElement()
                .satisfies(r -> assertThat(r.companyCode()).isEqualTo("DV03"));
        assertThat(service("2026-10-15").ledger(10L)).singleElement()
                .satisfies(r -> assertThat(r.companyCode()).isEqualTo("DV01"));
    }

    @Test
    void helpersForReceiptsRemindersAndLock() {
        due(10L, 1L, 800_000, 10);
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(300_000, 1)));
        CompanyLedgerService s = service("2026-10-15");

        assertThat(s.remaining(1L, 10L)).isEqualTo(500_000);
        assertThat(s.remaining(3L, 10L)).isZero();
        assertThat(s.companiesWithDebt(10L)).extracting(LedgerRow::companyCode).containsExactly("DV01");

        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(800_000, 2)));
        assertThat(s.companiesWithDebt(10L)).isEmpty();
    }

    @Test
    void periodWithoutChargesHasNoRows() {
        assertThat(service("2026-10-15").ledger(10L)).isEmpty();
        assertThat(service("2026-10-15").row(1L, 10L).due()).isZero();
    }

    private CollectionPeriod period(PeriodType type, int month, String due, Long id) {
        CollectionPeriod p = CollectionPeriod.open(type, 2026, month, null, LocalDate.parse(due), bg);
        ReflectionTestUtils.setField(p, "id", id);
        return p;
    }

    private static Company company(String code, Long id) {
        Company c = Company.create(code, "Công ty " + code, "A", "0900000001", LocalDate.of(2026, 1, 1));
        ReflectionTestUtils.setField(c, "id", id);
        return c;
    }
}
