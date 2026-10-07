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
import java.util.ArrayList;
import java.util.List;
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
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.domain.Settlement;
import vn.dongthanh.vsmt.remittance.domain.SettlementRepository;
import vn.dongthanh.vsmt.remittance.service.AreaProgressService.AreaProgress;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService.LedgerRow;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyPeriodAmount;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Progress;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Reconciliation;

/**
 * Công thức sổ công ty–kỳ (R6–R14, góp ý BA 05/10: phải nộp xã tính trên đã thu), phiếu quyết toán (07/10) và mỗi nhánh
 * trạng thái. Hạn quyết toán của kỳ 10 là 05/11.
 */
class CompanyLedgerServiceTest {

    final LedgerQueries queries = mock(LedgerQueries.class);
    final SettlementRepository settlementRepo = mock(SettlementRepository.class);
    final List<Settlement> settlements = new ArrayList<>();
    final CollectionPeriodRepository periods = mock(CollectionPeriodRepository.class);
    final CompanyRepository companies = mock(CompanyRepository.class);

    final TariffVersion bg = TariffVersion.create("BG", "QĐ", LocalDate.of(2026, 1, 1), null, TariffStatus.ACTIVE);
    final CollectionPeriod sept = period(PeriodType.MONTH, 9, "2026-09-30", 9L);
    final CollectionPeriod oct = period(PeriodType.MONTH, 10, "2026-10-31", 10L);
    final Company dv01 = company("DV01", 1L);
    final Company dv03 = company("DV03", 3L);

    CompanyLedgerService service(String today) {
        Clock clock = Clock.fixed(Instant.parse(today + "T05:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        return new CompanyLedgerService(queries, settlementRepo, periods, companies, clock);
    }

    @BeforeEach
    void setUp() {
        when(periods.findById(9L)).thenReturn(Optional.of(sept));
        when(periods.findById(10L)).thenReturn(Optional.of(oct));
        when(companies.findAllById(any())).thenReturn(List.of(dv01, dv03));
        when(settlementRepo.findByPeriodId(anyLong())).thenAnswer(i -> settlements.stream()
                .filter(x -> x.getPeriod().getId().equals(i.getArgument(0))).toList());
        when(settlementRepo.findAllWithPeriod()).thenAnswer(i -> List.copyOf(settlements));
        when(settlementRepo.search(any(), any())).thenAnswer(i -> settlements.stream()
                .filter(x -> x.getCompany().getId().equals(i.getArgument(1))).toList());
    }

    void due(long periodId, long companyId, long amount, long count) {
        when(queries.dueByCompany(periodId)).thenReturn(List.of(new LedgerQueries.CompanyAmount(companyId, amount, count)));
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

    /** Phiếu quyết toán của công ty ở kỳ với chênh lệch {@code amount} (dương công ty nộp, âm xã trả); thay phiếu cũ nếu có. */
    void settle(long periodId, long companyId, long amount) {
        CollectionPeriod p = periodId == 9L ? sept : oct;
        Company c = companyId == 1L ? dv01 : dv03;
        settlements.removeIf(x -> x.getPeriod() == p && x.getCompany() == c);
        Settlement x = Settlement.builder().code("QT-" + periodId + "-" + companyId).company(c).period(p)
                .companyOwes(Math.max(amount, 0)).communeOwes(Math.max(-amount, 0)).method(ReceiptMethod.TRANSFER)
                .settleDate(LocalDate.of(2026, 11, 1)).representativeName("A").build();
        ReflectionTestUtils.setField(x, "id", periodId * 100 + companyId);
        settlements.add(x);
    }

    void unsettle() {
        settlements.clear();
    }

    @Test
    void dueCollectedReceivedAndRemainingPerCompany() {
        when(queries.dueByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 1_600_000, 20),
                new LedgerQueries.CompanyAmount(3L, 800_000, 10)));
        collect(10L, 1L, 1_000_000, 200_000);
        settle(10L, 1L, 700_000);

        List<LedgerRow> rows = service("2026-10-15").ledger(10L);

        assertThat(rows).extracting(LedgerRow::companyCode).containsExactly("DV01", "DV03");
        LedgerRow r = rows.get(0);
        assertThat(r.due()).isEqualTo(1_600_000);
        assertThat(r.chargeCount()).isEqualTo(20);
        assertThat(r.collected()).isEqualTo(1_200_000);
        assertThat(r.cashCollected()).isEqualTo(1_000_000);
        // Phải nộp xã tính trên TIỀN MẶT đã thu (chuyển khoản vào tài khoản xã, công ty không cầm), không phải phải thu.
        assertThat(r.payable()).isEqualTo(1_000_000);
        assertThat(r.received()).isEqualTo(700_000);
        assertThat(r.settlementCode()).isEqualTo("QT-10-1");
        assertThat(rows.get(1).settlementId()).isNull();
        assertThat(r.remaining()).isEqualTo(300_000);
        assertThat(r.gap()).isEqualTo(-300_000);
        assertThat(r.collectionRate()).isEqualTo(75.0);
        assertThat(r.lowCollectionRate()).isFalse();
        assertThat(rows.get(1).collectionRate()).isZero();
        assertThat(rows.get(1).lowCollectionRate()).isTrue(); // DV03 phải thu 800.000, chưa thu
        assertThat(r.remittedRate()).isEqualTo(70.0);
        assertThat(r.lowRemittedRate()).isFalse();
        assertThat(rows.get(1).payable()).isZero();
        assertThat(rows.get(1).remittedRate()).isZero();
        assertThat(rows.get(1).lowRemittedRate()).isFalse(); // chưa thu gì thì chưa phải nộp gì
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
        settle(10L, 1L, 359_999);
        LedgerRow row = service("2026-10-15").row(1L, 10L);
        assertThat(row.collectionRate()).isEqualTo(80.0);
        assertThat(row.lowCollectionRate()).isFalse();
        assertThat(row.remittedRate()).isEqualTo(45.0);
        assertThat(row.lowRemittedRate()).isTrue();

        settle(10L, 1L, 360_000);
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
        settle(10L, 1L, 900_000);
        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.retained()).isEqualTo(100_000);
        assertThat(r.payable()).isEqualTo(900_000);
        assertThat(r.remaining()).isZero();
        assertThat(r.progress()).isEqualTo(Progress.PAID_IN_FULL);
        assertThat(r.reconciliation()).isEqualTo(Reconciliation.MATCHED);
        assertThat(r.gap()).isZero();

        // Phiếu ghi 450.000: còn phải nộp 450.000, tỷ lệ nộp = 450.000 / 900.000 = 50%.
        settle(10L, 1L, 450_000);
        LedgerRow half = service("2026-10-15").row(1L, 10L);
        assertThat(half.remaining()).isEqualTo(450_000);
        assertThat(half.remittedRate()).isEqualTo(50.0);
    }

    @Test
    void retainedAlsoCoversBankTransfersSoPayableCanBeNegative() {
        // Hộ chuyển khoản 1.000.000 vào tài khoản xã, công ty không thu tiền mặt nào: công ty vẫn được hưởng phí thu gom
        // 228.000 của số đã thu, nên phải nộp xã = 0 − 228.000 = −228.000 (không cắt về 0): xã trả lại công ty.
        due(10L, 1L, 1_000_000, 10);
        collect(10L, 1L, 0, 1_000_000);
        retained(10L, 1L, 228_000);
        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.collected()).isEqualTo(1_000_000);
        assertThat(r.cashCollected()).isZero();
        assertThat(r.retained()).isEqualTo(228_000);
        assertThat(r.payable()).isEqualTo(-228_000);
        assertThat(r.remaining()).isEqualTo(-228_000);
        assertThat(r.gap()).isEqualTo(228_000);
        // Chưa quyết toán: xã còn nợ công ty 228.000, đối soát chưa Khớp.
        assertThat(r.progress()).isEqualTo(Progress.NOT_PAID);
        assertThat(r.communePaid()).isZero();
        assertThat(r.communeOwed()).isEqualTo(228_000);
        assertThat(r.reconciliation()).isEqualTo(Reconciliation.PENDING);
        assertThat(r.lowRemittedRate()).isFalse();
        // Phiếu quyết toán chênh lệch −228.000: xã đã trả, Khớp; còn phải nộp vẫn âm.
        settle(10L, 1L, -228_000);
        LedgerRow full = service("2026-10-15").row(1L, 10L);
        assertThat(full.communePaid()).isEqualTo(228_000);
        assertThat(full.communeOwed()).isZero();
        assertThat(full.remaining()).isEqualTo(-228_000);
        assertThat(full.reconciliation()).isEqualTo(Reconciliation.MATCHED);
        assertThat(full.progress()).isEqualTo(Progress.PAID_IN_FULL);
        assertThat(service("2026-10-15").unsettled(10L)).isEmpty();
    }

    @Test
    void mixedCashAndTransferPayableIsCashMinusRetainedOfEverythingCollected() {
        // Thu 1.000.000: 600.000 tiền mặt + 400.000 chuyển khoản, phí thu gom của cả 1.000.000 là 228.000.
        // Phải nộp xã = 600.000 − 228.000 = 372.000.
        due(10L, 1L, 1_000_000, 10);
        collect(10L, 1L, 600_000, 400_000);
        retained(10L, 1L, 228_000);
        LedgerRow r = service("2026-10-15").row(1L, 10L);

        assertThat(r.payable()).isEqualTo(372_000);
        assertThat(r.remaining()).isEqualTo(372_000);
        assertThat(r.gap()).isEqualTo(-372_000);
        assertThat(r.progress()).isEqualTo(Progress.NOT_PAID);
    }

    @Test
    void nothingCollectedMeansNothingPayableYet() {
        due(10L, 1L, 1_000_000, 10);
        LedgerRow r = service("2026-10-15").row(1L, 10L);
        assertThat(r.retained()).isZero();
        assertThat(r.payable()).isZero();
        assertThat(r.remaining()).isZero();

        // Điều chỉnh kỳ trước (khoản kỳ đã khóa được xóa nợ ghi ở kỳ này) trừ vào phải nộp: tiền mặt 1.000.000, điều chỉnh
        // 200.000 trong đó thu gom 40.000 đã trừ khỏi phần giữ lại (160.000 sau khi trừ).
        collect(10L, 1L, 1_000_000, 0);
        when(queries.writeOffAdjustmentByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 200_000, 2)));
        retained(10L, 1L, 160_000);
        LedgerRow adjusted = service("2026-10-15").row(1L, 10L);
        assertThat(adjusted.payable()).isEqualTo(1_000_000 - 200_000 - 160_000);
        assertThat(adjusted.remaining()).isEqualTo(adjusted.payable());
    }

    @Test
    void previousDebtUsesPayableOnWhatWasCollected() {
        // Kỳ 9 công ty phải nộp xã 900.000 (tính trên đã thu): nộp 900.000 thì hết nợ, nộp 800.000 thì nợ 100.000.
        when(queries.payableByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, 900_000)));
        when(periods.findAllById(any())).thenReturn(List.of(sept));
        settle(9L, 1L, 900_000);
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).isEmpty();

        // Chưa quyết toán kỳ 9 (qua hạn 05/10): nợ cả 900.000.
        unsettle();
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).singleElement().satisfies(d -> assertThat(d.remaining()).isEqualTo(900_000));

        // Kỳ 9 xã phải trả lại công ty (phải nộp âm): không phải nợ.
        when(queries.payableByCompanyAndPeriodBefore(any())).thenReturn(List.of(new CompanyPeriodAmount(1L, 9L, -50_000)));
        assertThat(service("2026-10-15").overdueDebtsOf(1L)).isEmpty();
    }

    @Test
    void progressStatusBranches() {
        // Chưa quyết toán, chưa tới hạn quyết toán (05/11, đúng ngày hạn vẫn trong hạn).
        due(10L, 1L, 800_000, 10);
        collect(10L, 1L, 800_000, 0);
        assertThat(service("2026-10-15").row(1L, 10L).progress()).isEqualTo(Progress.NOT_PAID);
        assertThat(service("2026-11-05").row(1L, 10L).overdue()).isFalse();

        // Quá hạn quyết toán.
        LedgerRow late = service("2026-11-06").row(1L, 10L);
        assertThat(late.progress()).isEqualTo(Progress.OVERDUE);
        assertThat(late.overdue()).isTrue();

        // Đã quyết toán (kể cả trễ).
        settle(10L, 1L, 800_000);
        LedgerRow done = service("2026-11-06").row(1L, 10L);
        assertThat(done.progress()).isEqualTo(Progress.PAID_IN_FULL);
        assertThat(done.overdue()).isFalse();
    }

    @Test
    void previousPeriodDebtMakesProgressOverdueAndIsSummed() {
        due(10L, 1L, 800_000, 10);
        collect(10L, 1L, 800_000, 0); // kỳ này còn phải nộp nên mới xét nợ kỳ trước làm tiến độ quá hạn
        when(queries.payableByCompanyAndPeriodBefore(any())).thenReturn(List.of(
                new CompanyPeriodAmount(1L, 9L, 500_000), new CompanyPeriodAmount(3L, 9L, 400_000)));
        settle(9L, 1L, 200_000);

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
        settle(9L, 1L, 600_000);
        settle(10L, 1L, 100_000);

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
        // Đang nộp: trong hạn quyết toán, chưa có phiếu. Chưa thu gì (chênh lệch 0) vẫn phải quyết toán.
        assertThat(service("2026-10-15").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.PENDING);
        assertThat(service("2026-10-15").row(1L, 10L).settled()).isFalse();
        collect(10L, 1L, 800_000, 0);
        assertThat(service("2026-10-15").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.PENDING);

        // Lệch: qua hạn quyết toán mà chưa có phiếu.
        assertThat(service("2026-11-06").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.MISMATCH);

        // Khớp: đã có phiếu quyết toán.
        settle(10L, 1L, 800_000);
        assertThat(service("2026-11-06").row(1L, 10L).reconciliation()).isEqualTo(Reconciliation.MATCHED);
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
    void unsettledListsCompaniesWithFiguresButNoSettlement() {
        // DV01 có khoản, DV03 chỉ có trong danh sách công ty (không số liệu) thì không cần quyết toán.
        due(10L, 1L, 800_000, 10);
        collect(10L, 1L, 800_000, 0);
        CompanyLedgerService s = service("2026-10-15");

        assertThat(s.unsettled(10L)).extracting(LedgerRow::companyCode).containsExactly("DV01");
        assertThat(s.row(3L, 10L).settled()).isTrue();

        settle(10L, 1L, 800_000);
        assertThat(s.unsettled(10L)).isEmpty();
    }

    /** SPEC đối soát mẫu: mỗi khoản 60.000 = vận chuyển 20.000 + thu gom 40.000. Cty A: 620 tiền mặt, 260 QR. */
    @Test
    void reconciliationSplitsQrAndCashAndSettlesBySettlement() {
        due(10L, 1L, 52_800_000, 880);
        collect(10L, 1L, 37_200_000, 15_600_000);
        retained(10L, 1L, 35_200_000);
        when(queries.qrByCompany(10L)).thenReturn(List.of(new LedgerQueries.QrAmount(1L, 15_600_000, 10_400_000, 0)));

        LedgerRow open = service("2026-10-15").row(1L, 10L);

        assertThat(open.qrTotal()).isEqualTo(15_600_000);
        assertThat(open.qrTransport()).isEqualTo(5_200_000);
        assertThat(open.qrCollection()).isEqualTo(10_400_000);
        assertThat(open.cashTransport()).isEqualTo(12_400_000);
        assertThat(open.cashCollection()).isEqualTo(24_800_000);
        assertThat(open.payable()).isEqualTo(2_000_000);
        assertThat(open.entitled()).isEqualTo(17_600_000);
        assertThat(open.holding()).isEqualTo(15_600_000);
        assertThat(open.settled()).isFalse();

        settle(10L, 1L, 2_000_000);
        LedgerRow settled = service("2026-10-15").row(1L, 10L);
        assertThat(settled.holding()).isEqualTo(17_600_000).isEqualTo(settled.entitled());
        assertThat(settled.settled()).isTrue();
    }

    /** Cty B: 305 tiền mặt, 435 QR: net −11.300.000, xã trả công ty; trả đủ thì holding = entitled. */
    @Test
    void reconciliationCommunePaysWhenQrCollectionExceedsCashTransport() {
        due(10L, 1L, 44_400_000, 740);
        collect(10L, 1L, 18_300_000, 26_100_000);
        retained(10L, 1L, 29_600_000);
        when(queries.qrByCompany(10L)).thenReturn(List.of(new LedgerQueries.QrAmount(1L, 26_100_000, 17_400_000, 0)));

        LedgerRow open = service("2026-10-15").row(1L, 10L);
        assertThat(open.payable()).isEqualTo(-11_300_000);
        assertThat(open.cashTransport()).isEqualTo(6_100_000);
        assertThat(open.holding() - open.entitled()).isEqualTo(11_300_000);
        assertThat(open.settled()).isFalse();

        settle(10L, 1L, -11_300_000);
        LedgerRow paid = service("2026-10-15").row(1L, 10L);
        assertThat(paid.holding()).isEqualTo(paid.entitled());
        assertThat(paid.settled()).isTrue();
    }

    /** Nhóm cân đủ chi phí 1.054 đ/kg = thu gom 453 + vận chuyển 180 + xử lý 421; 1.000 kg tiền mặt, 1.000 kg QR. */
    @Test
    void reconciliationSplitsProcessingFeeToCommune() {
        due(10L, 1L, 2_108_000, 2);
        collect(10L, 1L, 1_054_000, 1_054_000);
        retained(10L, 1L, 906_000);
        when(queries.processingByCompany(10L)).thenReturn(List.of(new LedgerQueries.CompanyAmount(1L, 842_000, 0)));
        when(queries.qrByCompany(10L)).thenReturn(List.of(new LedgerQueries.QrAmount(1L, 1_054_000, 453_000, 421_000)));

        LedgerRow open = service("2026-10-15").row(1L, 10L);

        assertThat(open.qrTransport()).isEqualTo(180_000);
        assertThat(open.qrProcessing()).isEqualTo(421_000);
        assertThat(open.cashTransport()).isEqualTo(180_000);
        assertThat(open.cashCollection()).isEqualTo(453_000);
        assertThat(open.cashProcessing()).isEqualTo(421_000);
        assertThat(open.payable()).isEqualTo(148_000);
        assertThat(open.entitled()).isEqualTo(1_202_000);

        settle(10L, 1L, 148_000);
        LedgerRow settled = service("2026-10-15").row(1L, 10L);
        assertThat(settled.holding()).isEqualTo(settled.entitled());
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
