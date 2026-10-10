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

/** Công thức sổ công ty–kỳ (R6–R14, góp ý BA 05/10: phải nộp xã tính trên đã thu) và mỗi nhánh trạng thái. */
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
        when(remitted.receivedByCompany(anyLong())).thenReturn(Map.of());
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of());
    }

    void due(long periodId, long companyId, long amount, long count) {
        when(queries.dueByCompany(periodId)).thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, amount, count)));
        advance(periodId, companyId, amount);
    }

    void advance(long periodId, long companyId, long amount) {
        when(queries.advancePayableByCompany(periodId))
                .thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, amount, 0)));
    }

    /** Đã thu của một công ty ở một kỳ: tiền mặt + chuyển khoản; trả về phần tiền mặt để nối thêm phần giữ lại. */
    void collect(long periodId, long companyId, long cash, long transfer) {
        when(queries.collectedByCompany(periodId))
                .thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, cash + transfer, 5)));
        when(queries.cashCollectedByCompany(periodId)).thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, cash, 5)));
    }

    void retained(long periodId, long companyId, long amount) {
        when(queries.retainedByCompany(periodId)).thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, amount, 0)));
    }

    void received(long periodId, long companyId, long amount) {
        when(remitted.receivedByCompany(periodId)).thenReturn(Map.of(companyId, new RemittedTotals.Received(amount, 1)));
    }

    @Test
    void dueCollectedReceivedAndRemainingPerCompany() {
        when(queries.dueByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 1_600_000, 20),
                new LedgerQueries.CompanyAmount(3L, 800_000, 10)));
        collect(10L, 1L, 1_000_000, 200_000);
        when(queries.advancePayableByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 1_200_000, 0),
                new LedgerQueries.CompanyAmount(3L, 400_000, 0)));
        received(10L, 1L, 700_000);

        List<LedgerRow> rows = service("2026-10-15").ledger(10L);

        assertThat(rows).extracting(LedgerRow::companyCode).containsExactly("DV01", "DV03");
        LedgerRow r = rows.get(0);
        assertThat(r.due()).isEqualTo(1_600_000);
        assertThat(r.chargeCount()).isEqualTo(20);
        assertThat(r.collected()).isEqualTo(1_200_000);
        assertThat(r.cashCollected()).isEqualTo(1_000_000);
        assertThat(r.payable()).isEqualTo(1_200_000);
        assertThat(r.received()).isEqualTo(700_000);
        assertThat(r.receiptCount()).isEqualTo(1);
        assertThat(r.remaining()).isEqualTo(500_000);
        assertThat(r.gap()).isEqualTo(-500_000);
        assertThat(r.collectionRate()).isEqualTo(75.0);
        assertThat(r.lowCollectionRate()).isFalse();
        assertThat(rows.get(1).collectionRate()).isZero();
        assertThat(rows.get(1).lowCollectionRate()).isTrue(); // DV03 phải thu 800.000, chưa thu
        assertThat(r.remittedRate()).isEqualTo(58.3);
        assertThat(r.lowRemittedRate()).isFalse();
        assertThat(rows.get(1).payable()).isEqualTo(400_000);
        assertThat(rows.get(1).remittedRate()).isZero();
        assertThat(rows.get(1).lowRemittedRate()).isTrue();
    }

    @Test
    void debtCollectedIsThePartOfCollectedThatPaidOldLockedPeriods() {
        due(10L, 1L, 100_000, 2);
        collect(10L, 1L, 60_000, 40_000);
        when(queries.debtCollectedByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 50_000, 1)));

        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.collected()).isEqualTo(100_000);
        assertThat(r.debtCollected()).isEqualTo(50_000);
        assertThat(service("2026-10-15").row(3L, 10L).debtCollected()).isZero();
    }

    @Test
    void noFlagWhenNothingIsPayableToTheCommune() {
        // BR-REM-13 (QĐ-L2): công ty cầm lại toàn bộ số thu thì payable = 0, không gắn cờ nộp thấp.
        due(10L, 1L, 100_000, 2);
        collect(10L, 1L, 100_000, 0);
        retained(10L, 1L, 100_000);
        advance(10L, 1L, 0);
        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.payable()).isZero();
        assertThat(r.remittedRate()).isZero();
        assertThat(r.lowRemittedRate()).isFalse();

        // Công ty không có khoản nào trong kỳ (phải thu 0): không gắn cờ thu thấp (BR-REM-10).
        LedgerRow empty = service("2026-10-15").row(3L, 10L);
        assertThat(empty.due()).isZero();
        assertThat(empty.lowCollectionRate()).isFalse();
        assertThat(empty.lowRemittedRate()).isFalse();
    }

    @Test
    void companyFlagFollowsRemittedAndRatesAreComparedExactlyNotAfterRounding() {
        // Công ty thu tiền mặt 800.000 nhưng mới nộp 359.999 / 800.000 = 44,9999% (hiện "45,0"): cờ công ty bật theo đã nộp.
        due(10L, 1L, 1_000_000, 10);
        collect(10L, 1L, 800_000, 0);
        received(10L, 1L, 359_999);
        advance(10L, 1L, 800_000);
        LedgerRow row = service("2026-10-15").row(1L, 10L);
        assertThat(row.collectionRate()).isEqualTo(80.0);
        assertThat(row.lowCollectionRate()).isFalse();
        assertThat(row.remittedRate()).isEqualTo(45.0);
        assertThat(row.lowRemittedRate()).isTrue();

        received(10L, 1L, 360_000);
        assertThat(service("2026-10-15").row(1L, 10L).lowRemittedRate()).isFalse();
        collect(10L, 1L, 359_999, 0);
        assertThat(service("2026-10-15").row(1L, 10L).lowCollectionRate()).isTrue();

        // Cấp tổ vẫn theo đã thu / phải thu.
        assertThat(new AreaProgress(null, null, 800_000, 359_999, 10, 5, 0, 10, 0).lowCollectionRate()).isTrue();
        assertThat(new AreaProgress(null, null, 800_000, 360_000, 10, 5, 0, 10, 0).lowCollectionRate()).isFalse();
        assertThat(new AreaProgress(null, null, 0, 0, 0, 0, 0, 10, 0).lowCollectionRate()).isFalse();
    }

    @Test
    void retainedCollectionPartReducesPayableAndKeepsReconciliationMatched() {
        // Công ty thu tiền mặt 1.000.000, cầm lại phần thu gom 100.000, nộp 900.000: nộp đủ, đối soát khớp.
        due(10L, 1L, 1_000_000, 10);
        collect(10L, 1L, 1_000_000, 0);
        retained(10L, 1L, 100_000);
        received(10L, 1L, 900_000);
        advance(10L, 1L, 900_000);
        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.retained()).isEqualTo(100_000);
        assertThat(r.payable()).isEqualTo(900_000);
        assertThat(r.remaining()).isZero();
        assertThat(r.progress()).isEqualTo(Progress.PAID_IN_FULL);
        assertThat(r.reconciliation()).isEqualTo(Reconciliation.MATCHED);
        assertThat(r.gap()).isZero();

        // Mới nộp 450.000: còn phải nộp 450.000, tỷ lệ nộp = 450.000 / 900.000 = 50%.
        received(10L, 1L, 450_000);
        LedgerRow half = service("2026-10-15").row(1L, 10L);
        assertThat(half.remaining()).isEqualTo(450_000);
        assertThat(half.remittedRate()).isEqualTo(50.0);
    }

    @Test
    void paymentMethodDoesNotChangeAdvancePayable() {
        // Hộ chuyển khoản 1.000.000 vào tài khoản công ty, không có tiền mặt: công ty giữ phí thu gom 228.000,
        // phải nộp xã = 1.000.000 − 228.000 = 772.000. Thu 600.000 tiền mặt + 400.000 chuyển khoản cũng ra như vậy.
        due(10L, 1L, 1_000_000, 10);
        collect(10L, 1L, 0, 1_000_000);
        retained(10L, 1L, 228_000);
        advance(10L, 1L, 772_000);
        LedgerRow transferOnly = service("2026-10-15").row(1L, 10L);
        assertThat(transferOnly.cashCollected()).isZero();
        assertThat(transferOnly.payable()).isEqualTo(772_000);

        collect(10L, 1L, 600_000, 400_000);
        received(10L, 1L, 300_000);
        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.payable()).isEqualTo(772_000);
        assertThat(r.remaining()).isEqualTo(472_000);
        assertThat(r.gap()).isEqualTo(-472_000);
        assertThat(r.remittedRate()).isEqualTo(38.9);
        assertThat(r.lowRemittedRate()).isTrue();
        assertThat(r.progress()).isEqualTo(Progress.PARTIAL);
        assertThat(r.communeOwed()).isZero();
    }

    @Test
    void advanceIsPayableEvenBeforeCollectingAndWriteOffReducesIt() {
        due(10L, 1L, 1_000_000, 10);
        advance(10L, 1L, 800_000);
        LedgerRow r = service("2026-10-15").row(1L, 10L);
        assertThat(r.retained()).isZero();
        assertThat(r.collected()).isZero();
        assertThat(r.payable()).isEqualTo(800_000);
        assertThat(r.remaining()).isEqualTo(800_000);
        received(10L, 1L, 800_000);
        assertThat(service("2026-10-15").row(1L, 10L).settled()).isTrue();
        received(10L, 1L, 0);

        // Điều chỉnh kỳ trước (khoản kỳ đã khóa được xóa nợ ghi ở kỳ này) trừ vào phải nộp: tiền mặt 1.000.000, điều chỉnh
        // 200.000 trong đó thu gom 40.000 đã trừ khỏi phần giữ lại (160.000 sau khi trừ).
        collect(10L, 1L, 1_000_000, 0);
        when(queries.writeOffAdjustmentByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 200_000, 2)));
        retained(10L, 1L, 160_000);
        advance(10L, 1L, 640_000);
        LedgerRow adjusted = service("2026-10-15").row(1L, 10L);
        assertThat(adjusted.payable()).isEqualTo(1_000_000 - 200_000 - 160_000);
        assertThat(adjusted.remaining()).isEqualTo(adjusted.payable());
    }

    @Test
    void previousDebtUsesPayableOnWhatWasCollected() {
        // Kỳ 9 công ty phải nộp xã 900.000 (tính trên đã thu): nộp 900.000 thì hết nợ, nộp 800.000 thì nợ 100.000.
        when(queries.payableByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 900_000)));
        when(periods.findAllById(any())).thenReturn(List.of(sept));
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 900_000)));
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).isEmpty();

        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 800_000)));
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).singleElement().satisfies(d -> assertThat(d.remaining()).isEqualTo(100_000));

        // Kỳ 9 xã phải trả lại công ty (phải nộp âm): không phải nợ.
        when(queries.payableByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, -50_000)));
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of());
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).isEmpty();
    }

    @Test
    void progressStatusBranches() {
        // Chưa nộp: đã thu tiền mặt 800.000, chưa có phiếu thu, chưa quá hạn.
        due(10L, 1L, 800_000, 10);
        collect(10L, 1L, 800_000, 0);
        assertThat(service("2026-10-15").row(1L, 10L).progress()).isEqualTo(Progress.NOT_PAID);

        // Nộp một phần.
        received(10L, 1L, 300_000);
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
        collect(10L, 1L, 800_000, 0); // kỳ này còn phải nộp nên mới xét nợ kỳ trước làm tiến độ quá hạn
        when(queries.payableByCompanyAndPeriodBefore(any())).thenReturn(List.of(
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
        when(queries.payableByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 500_000)));
        when(remitted.receivedByCompanyAndPeriod()).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 600_000),
                new CompanyPeriodAmount(1L, 10L, 100_000)));

        assertThat(service("2026-10-15").row(1L, 10L).previousDebt()).isZero();
    }

    @Test
    void previousDebtOnlyCountsOlderPeriods() {
        // Kỳ 10 quá hạn còn nợ không được làm kỳ 09 (cũ hơn, đã nộp đủ) có nợ kỳ trước.
        due(9L, 1L, 500_000, 5);
        when(queries.payableByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 10L, 800_000)));

        assertThat(service("2026-11-15").row(1L, 9L).previousDebt()).isZero();
    }

    @Test
    void reconciliationBranches() {
        due(10L, 1L, 800_000, 10);
        // Đang nộp: trong hạn, đã thu nhưng chưa nộp hết.
        collect(10L, 1L, 800_000, 0);
        received(10L, 1L, 500_000);
        assertThat(service("2026-10-15").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.PENDING);

        // Lệch: hết hạn mà vẫn thu rồi chưa nộp.
        assertThat(service("2026-11-02").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.MISMATCH);

        // Khớp: nộp đủ phải nộp xã.
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
        collect(10L, 1L, 800_000, 0);
        received(10L, 1L, 300_000);
        CompanyLedgerService s = service("2026-10-15");

        assertThat(s.remaining(1L, 10L)).isEqualTo(500_000);
        assertThat(s.remaining(3L, 10L)).isZero();
        assertThat(s.companiesWithDebt(10L)).extracting(LedgerRow::companyCode).containsExactly("DV01");

        when(remitted.receivedByCompany(10L)).thenReturn(Map.of(1L, new RemittedTotals.Received(800_000, 2)));
        assertThat(s.companiesWithDebt(10L)).isEmpty();
    }

    /**
     * Nhóm cân đủ chi phí 1.054 đ/kg = thu gom 453 + vận chuyển 180 + xử lý 421; 1.000 kg tiền mặt, 1.000 kg chuyển khoản,
     * đều vào công ty. Phải nộp xã = vận chuyển + xử lý của cả 2.000 kg; phiếu thu đủ thì Khớp.
     */
    @Test
    void payableIsTransportPlusProcessingOfEverythingCollectedAndSettlesByReceipt() {
        due(10L, 1L, 2_108_000, 2);
        collect(10L, 1L, 1_054_000, 1_054_000);
        retained(10L, 1L, 906_000);
        advance(10L, 1L, 1_202_000);
        when(queries.advanceProcessingByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 842_000, 0)));
        when(queries.processingByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 842_000, 0)));

        LedgerRow open = service("2026-10-15").row(1L, 10L);

        assertThat(open.payable()).isEqualTo(1_202_000);
        assertThat(open.payableTransport()).isEqualTo(360_000);
        assertThat(open.payableProcessing()).isEqualTo(842_000);
        assertThat(open.transport()).isEqualTo(360_000);
        assertThat(open.remaining()).isEqualTo(1_202_000);
        assertThat(open.settled()).isFalse();

        received(10L, 1L, 1_202_000);
        LedgerRow settled = service("2026-10-15").row(1L, 10L);
        assertThat(settled.remaining()).isZero();
        assertThat(settled.settled()).isTrue();
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
