package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.service.PeriodService;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService.LedgerRow;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Progress;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Reconciliation;
import vn.dongthanh.vsmt.remittance.service.PeriodLockService;
import vn.dongthanh.vsmt.support.MutableClock;

/**
 * Khóa kỳ (UC-39, góp ý BA 05/10): chặn khi còn công ty chưa nộp đủ phải nộp xã (G15, R19) hoặc kỳ còn khoản hộ chưa
 * đóng mà chưa đến hạn nộp; khóa được khi đủ điều kiện (G1). Hạn nộp của kỳ trong test: 31/10/2026.
 */
class PeriodLockServiceTest {

    final CollectionPeriodRepository periods = mock(CollectionPeriodRepository.class);
    final CompanyLedgerService ledger = mock(CompanyLedgerService.class);
    final PeriodService periodService = mock(PeriodService.class);
    final MutableClock today = new MutableClock(Instant.parse("2026-10-15T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final PeriodLockService service = new PeriodLockService(periods, ledger, periodService, today);

    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    CollectionPeriod october;

    @BeforeEach
    void setUp() {
        TariffVersion bg = TariffVersion.create("BG", "QĐ", LocalDate.of(2026, 9, 1), null, TariffStatus.ACTIVE);
        october = CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg);
        ReflectionTestUtils.setField(october, "id", 10L);
        when(periods.findByIdForUpdate(10L)).thenReturn(Optional.of(october));
        when(ledger.companiesWithDebt(10L)).thenReturn(List.of());
        when(ledger.unidentifiedQr()).thenReturn(new LedgerQueries.UnidentifiedQr(0, 0));
        when(ledger.unpaidChargeCount(10L)).thenReturn(0L);
    }

    @Test
    void debtBlocksLockingAndListsCompaniesWithAmounts() {
        when(ledger.companiesWithDebt(10L)).thenReturn(List.of(debt("DV01", 600_000), debt("DV07", 800_000)));

        assertThatThrownBy(() -> service.lock(10L, officer))
                .hasMessageContaining("DV01: 600.000 đ")
                .hasMessageContaining("DV07: 800.000 đ")
                .extracting("code").isEqualTo("PERIOD_HAS_DEBT");
        verify(periodService, never()).markLocked(any(), any());
    }

    @Test
    void noDebtLocksThroughMasterDataService() {
        when(periodService.markLocked(october, officer)).thenReturn(october);

        assertThat(service.lock(10L, officer)).isSameAs(october);
        verify(periodService).markLocked(eq(october), eq(officer));
    }

    @Test
    void onlyCommuneOfficerLocks() {
        assertThatThrownBy(() -> service.lock(10L, new CurrentUser(1L, "admin", Role.ADMIN, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void alreadyLockedPeriodIsRejectedBeforeCheckingDebt() {
        ReflectionTestUtils.setField(october, "status", PeriodStatus.LOCKED);
        assertThatThrownBy(() -> service.lock(10L, officer)).extracting("code").isEqualTo("PERIOD_INVALID_TRANSITION");
        verify(ledger, never()).companiesWithDebt(any());
    }

    @Test
    void everyChargeCollectedLocksEvenBeforeTheDueDate() {
        // Nhánh 1: mọi công ty đã nộp đủ + kỳ đã thu đủ mọi khoản (không còn khoản Chưa thu), chưa đến hạn nộp.
        when(periodService.markLocked(october, officer)).thenReturn(october);

        assertThat(service.lock(10L, officer)).isSameAs(october);
    }

    @Test
    void uncollectedChargesBlockLockingBeforeTheDueDate() {
        when(ledger.unpaidChargeCount(10L)).thenReturn(3L);

        assertThatThrownBy(() -> service.lock(10L, officer))
                .hasMessageContaining("còn 3 khoản hộ chưa đóng")
                .hasMessageContaining("chưa đến hạn nộp (31/10/2026)")
                .extracting("code").isEqualTo("PERIOD_NOT_DUE");
        verify(periodService, never()).markLocked(any(), any());
    }

    @Test
    void uncollectedChargesDoNotBlockOnceTheDueDateIsReached() {
        // Nhánh 2: còn khoản hộ chưa đóng nhưng đã đến hạn nộp (đúng ngày hạn cũng tính) thì khóa được; khoản đó thành công nợ hộ.
        when(ledger.unpaidChargeCount(10L)).thenReturn(3L);
        when(periodService.markLocked(october, officer)).thenReturn(october);

        today.set(Instant.parse("2026-10-30T03:00:00Z"));
        assertThatThrownBy(() -> service.lock(10L, officer)).extracting("code").isEqualTo("PERIOD_NOT_DUE");
        today.set(Instant.parse("2026-10-31T03:00:00Z"));
        assertThat(service.lock(10L, officer)).isSameAs(october);
        today.set(Instant.parse("2026-11-02T03:00:00Z"));
        assertThat(service.lock(10L, officer)).isSameAs(october);
    }

    @Test
    void companyDebtBlocksEvenWhenTheDueDateHasPassed() {
        when(ledger.companiesWithDebt(10L)).thenReturn(List.of(debt("DV01", 600_000)));
        when(ledger.unpaidChargeCount(10L)).thenReturn(3L);
        today.set(Instant.parse("2026-11-02T03:00:00Z"));

        assertThatThrownBy(() -> service.lock(10L, officer))
                .hasMessageContaining("DV01: 600.000 đ")
                .extracting("code").isEqualTo("PERIOD_HAS_DEBT");
        verify(periodService, never()).markLocked(any(), any());
    }

    @Test
    void bothReasonsAreReportedTogether() {
        when(ledger.companiesWithDebt(10L)).thenReturn(List.of(debt("DV01", 600_000)));
        when(ledger.unpaidChargeCount(10L)).thenReturn(3L);

        assertThatThrownBy(() -> service.lock(10L, officer))
                .hasMessageContaining("DV01: 600.000 đ")
                .hasMessageContaining("còn 3 khoản hộ chưa đóng")
                .extracting("code").isEqualTo("PERIOD_HAS_DEBT");
    }

    @Test
    void companyThatTheCommuneStillOwesBlocksLockingUntilPaidInFull() {
        // Phải nộp xã âm: công ty không nợ xã (không trong companiesWithDebt) nhưng xã còn phải trả lại thì chặn khóa (UC-55).
        when(ledger.companiesCommuneOwes(10L)).thenReturn(List.of(owed("DV02", 34_000)));

        assertThatThrownBy(() -> service.lock(10L, officer))
                .hasMessageContaining("xã còn phải trả lại 1 công ty")
                .hasMessageContaining("DV02: 34.000 đ")
                .extracting("code").isEqualTo("PERIOD_COMMUNE_OWES");

        when(ledger.companiesCommuneOwes(10L)).thenReturn(List.of());
        when(periodService.markLocked(october, officer)).thenReturn(october);
        assertThat(service.lock(10L, officer)).isSameAs(october);
    }

    @Test
    void blocksWhileQrTransfersAreUnidentified() {
        when(ledger.unidentifiedQr()).thenReturn(new LedgerQueries.UnidentifiedQr(3, 180_000));

        assertThatThrownBy(() -> service.lock(10L, officer)).extracting("code").isEqualTo("PERIOD_UNIDENTIFIED_QR");
    }

    private static LedgerRow owed(String code, long communeOwed) {
        return new LedgerRow(1L, code, "Công ty " + code, 10L, 0, 1, 0, 0, 0, 0, 0, 0, -communeOwed, communeOwed, 0, false, 0, true,
                0, false, Progress.PAID_IN_FULL, Reconciliation.PENDING, 0, -communeOwed, 0, 0, communeOwed, 0);
    }

    private static LedgerRow debt(String code, long remaining) {
        return new LedgerRow(1L, code, "Công ty " + code, 10L, remaining, 1, 0, 0, remaining, remaining, 0, 0, remaining, 0, 0, false, 0, true,
                0, true, Progress.NOT_PAID, Reconciliation.PENDING, 0, remaining, 0, 0, 0, 0);
    }
}
