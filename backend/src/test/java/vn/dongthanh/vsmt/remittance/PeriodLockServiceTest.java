package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
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

/**
 * Khóa kỳ (UC-39, 07/10): chặn khi còn chuyển khoản chưa xác định công ty hoặc còn công ty chưa quyết toán; khóa được khi
 * đủ điều kiện (G1).
 */
class PeriodLockServiceTest {

    final CollectionPeriodRepository periods = mock(CollectionPeriodRepository.class);
    final CompanyLedgerService ledger = mock(CompanyLedgerService.class);
    final PeriodService periodService = mock(PeriodService.class);
    final PeriodLockService service = new PeriodLockService(periods, ledger, periodService);

    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    CollectionPeriod october;

    @BeforeEach
    void setUp() {
        TariffVersion bg = TariffVersion.create("BG", "QĐ", LocalDate.of(2026, 9, 1), null, TariffStatus.ACTIVE);
        october = CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 25), bg);
        ReflectionTestUtils.setField(october, "id", 10L);
        when(periods.findByIdForUpdate(10L)).thenReturn(Optional.of(october));
        when(ledger.unsettled(10L)).thenReturn(List.of());
        when(ledger.unidentifiedQr()).thenReturn(new LedgerQueries.UnidentifiedQr(0, 0));
    }

    @Test
    void unsettledCompaniesBlockLockingAndAreListed() {
        when(ledger.unsettled(10L)).thenReturn(List.of(unsettled("DV01"), unsettled("DV07")));

        assertThatThrownBy(() -> service.lock(10L, officer))
                .hasMessage("Chưa khóa được kỳ 2026-10 vì còn 2 công ty chưa quyết toán: DV01, DV07.")
                .extracting("code").isEqualTo("PERIOD_NOT_SETTLED");
        verify(periodService, never()).markLocked(any(), any());
    }

    @Test
    void everyCompanySettledLocksThroughMasterDataService() {
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
    void alreadyLockedPeriodIsRejectedBeforeCheckingSettlements() {
        ReflectionTestUtils.setField(october, "status", PeriodStatus.LOCKED);
        assertThatThrownBy(() -> service.lock(10L, officer)).extracting("code").isEqualTo("PERIOD_INVALID_TRANSITION");
        verify(ledger, never()).unsettled(any());
    }

    @Test
    void blocksWhileQrTransfersAreUnidentified() {
        when(ledger.unidentifiedQr()).thenReturn(new LedgerQueries.UnidentifiedQr(3, 180_000));

        assertThatThrownBy(() -> service.lock(10L, officer)).extracting("code").isEqualTo("PERIOD_UNIDENTIFIED_QR");
    }

    private static LedgerRow unsettled(String code) {
        return new LedgerRow(1L, code, "Công ty " + code, 10L, 100_000, 1, 0, 0, 0, 0, 0, null, null, 0, 0, 0, false, 0,
                true, 0, false, Progress.NOT_PAID, Reconciliation.PENDING, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
