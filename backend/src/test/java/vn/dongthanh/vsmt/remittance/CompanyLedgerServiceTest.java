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

/** Công thức sổ công ty–kỳ (R6–R14) theo mô hình 03/10 tính trên số đã thu, và mỗi nhánh trạng thái. */
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
        when(queries.collectedByCompanyAndPeriodBefore(any())).thenReturn(List.of());
        when(remitted.receivedByCompany(anyLong())).thenReturn(Map.of());
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of());
    }

    void due(long periodId, long companyId, long amount, long count) {
        when(queries.dueByCompany(periodId)).thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, amount, count)));
    }

    void collected(long periodId, long companyId, long amount, long retained) {
        when(queries.collectedByCompany(periodId)).thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, amount, 1)));
        when(queries.retainedByCompany(periodId)).thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, retained, 0)));
    }

    void received(long periodId, long companyId, long amount) {
        when(remitted.receivedByCompany(periodId)).thenReturn(Map.of(companyId, new RemittedTotals.Received(amount, 1)));
    }

    @Test
    void payableIsTransportPartOfWhatHouseholdsActuallyPaid() {
        // 100 hộ × 80.000đ (57.000 thu gom + 23.000 vận chuyển), mới thu 70 hộ: phải nộp xã chỉ tính trên 70 hộ.
        due(10L, 1L, 8_000_000, 100);
        collected(10L, 1L, 5_600_000, 3_990_000);

        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.due()).isEqualTo(8_000_000);
        assertThat(r.collected()).isEqualTo(5_600_000);
        assertThat(r.retained()).isEqualTo(3_990_000);
        assertThat(r.payable()).isEqualTo(1_610_000);
        assertThat(r.remaining()).isEqualTo(1_610_000);
        assertThat(r.gap()).isEqualTo(-1_610_000);
        assertThat(r.collectionRate()).isEqualTo(70.0);

        // Nộp đủ 1.610.000 thì không còn nợ dù 30 hộ chưa đóng: đối soát khớp, khóa kỳ được.
        received(10L, 1L, 1_610_000);
        LedgerRow paid = service("2026-11-02").row(1L, 10L);
        assertThat(paid.remaining()).isZero();
        assertThat(paid.gap()).isZero();
        assertThat(paid.progress()).isEqualTo(Progress.PAID_IN_FULL);
        assertThat(paid.reconciliation()).isEqualTo(Reconciliation.MATCHED);
        assertThat(paid.overdue()).isFalse();
        assertThat(service("2026-11-02").companiesWithDebt(10L)).isEmpty();
    }

    @Test
    void remittedRateIsComparedExactlyAgainstPayableNotDue() {
        due(10L, 1L, 800_000, 10);
        collected(10L, 1L, 800_000, 200_000);
        // Phải nộp 600.000; nộp 269.999 = 44,9998% (hiện "45,0") vẫn thấp, 270.000 thì không.
        received(10L, 1L, 269_999);
        LedgerRow low = service("2026-10-15").row(1L, 10L);
        assertThat(low.remittedRate()).isEqualTo(45.0);
        assertThat(low.lowRemittedRate()).isTrue();
        received(10L, 1L, 270_000);
        assertThat(service("2026-10-15").row(1L, 10L).lowRemittedRate()).isFalse();

        // Chưa hộ nào đóng: không có gì để nộp nên không bị gắn cờ nộp thấp (cờ thu thấp vẫn bật).
        when(remitted.receivedByCompany(10L)).thenReturn(Map.of());
        when(queries.collectedByCompany(10L)).thenReturn(List.of());
        when(queries.retainedByCompany(10L)).thenReturn(List.of());
        LedgerRow none = service("2026-10-15").row(1L, 10L);
        assertThat(none.lowRemittedRate()).isFalse();
        assertThat(none.lowCollectionRate()).isTrue();

        // Cấp tổ vẫn theo đã thu / phải thu.
        assertThat(new AreaProgress(null, null, 800_000, 359_999, 10, 5, 0, 10).lowCollectionRate()).isTrue();
        assertThat(new AreaProgress(null, null, 800_000, 360_000, 10, 5, 0, 10).lowCollectionRate()).isFalse();
        assertThat(new AreaProgress(null, null, 0, 0, 0, 0, 0, 10).lowCollectionRate()).isFalse();
    }

    @Test
    void feeWithoutCollectionPartIsRemittedInFull() {
        due(10L, 1L, 1_000_000, 10);
        collected(10L, 1L, 1_000_000, 0);
        LedgerRow r = service("2026-10-15").row(1L, 10L);
        assertThat(r.retained()).isZero();
        assertThat(r.payable()).isEqualTo(1_000_000);
    }

    @Test
    void writeOffAdjustmentIsDisplayedButDoesNotChangePayable() {
        due(10L, 1L, 1_000_000, 10);
        collected(10L, 1L, 500_000, 100_000);
        when(queries.writeOffAdjustmentByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 200_000, 2)));
        LedgerRow r = service("2026-10-15").row(1L, 10L);
        assertThat(r.adjustment()).isEqualTo(200_000);
        assertThat(r.payable()).isEqualTo(400_000);
    }

    @Test
    void previousDebtIsTransportPartOfCollectedMoneyLessReceipts() {
        // Kỳ 9: thu 1.000.000, giữ lại 100.000 → phải nộp 900.000. Nộp 900.000 thì hết nợ; nộp 800.000 còn nợ 100.000.
        when(queries.collectedByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 1_000_000)));
        when(queries.retainedByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 100_000)));
        when(periods.findAllById(any())).thenReturn(List.of(sept));
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 900_000)));
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).isEmpty();

        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 800_000)));
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).singleElement().satisfies(d -> assertThat(d.remaining()).isEqualTo(100_000));
    }

    @Test
    void progressStatusBranches() {
        due(10L, 1L, 800_000, 10);
        collected(10L, 1L, 800_000, 0);
        // Chưa nộp: chưa có biên nhận, chưa quá hạn.
        assertThat(service("2026-10-15").row(1L, 10L).progress()).isEqualTo(Progress.NOT_PAID);

        // Nộp một phần.
        received(10L, 1L, 300_000);
        assertThat(service("2026-10-15").row(1L, 10L).progress()).isEqualTo(Progress.PARTIAL);

        // Quá hạn nộp: hết hạn kỳ mà còn phải nộp.
        LedgerRow late = service("2026-11-02").row(1L, 10L);
        assertThat(late.progress()).isEqualTo(Progress.OVERDUE);
        assertThat(late.overdue()).isTrue();

        // Đã nộp đủ.
        received(10L, 1L, 800_000);
        assertThat(service("2026-11-02").row(1L, 10L).progress()).isEqualTo(Progress.PAID_IN_FULL);
    }

    @Test
    void previousPeriodDebtMakesProgressOverdueAndIsSummed() {
        due(10L, 1L, 800_000, 10);
        when(queries.collectedByCompanyAndPeriodBefore(any())).thenReturn(List.of(
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
        when(queries.collectedByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 500_000)));
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 600_000),
                new CompanyPeriodAmount(1L, 10L, 100_000)));

        assertThat(service("2026-10-15").row(1L, 10L).previousDebt()).isZero();
    }

    @Test
    void reconciliationBranches() {
        due(10L, 1L, 800_000, 10);
        // Đang nộp: trong hạn, đã thu nhưng chưa nộp hết.
        collected(10L, 1L, 800_000, 0);
        received(10L, 1L, 500_000);
        assertThat(service("2026-10-15").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.PENDING);

        // Lệch: hết hạn mà vẫn thu rồi chưa nộp.
        assertThat(service("2026-11-02").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.MISMATCH);

        // Khớp: nộp đủ phần phải nộp.
        received(10L, 1L, 800_000);
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
        collected(10L, 1L, 800_000, 0);
        received(10L, 1L, 300_000);
        CompanyLedgerService s = service("2026-10-15");

        assertThat(s.remaining(1L, 10L)).isEqualTo(500_000);
        assertThat(s.remaining(3L, 10L)).isZero();
        assertThat(s.companiesWithDebt(10L)).extracting(LedgerRow::companyCode).containsExactly("DV01");

        received(10L, 1L, 800_000);
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
