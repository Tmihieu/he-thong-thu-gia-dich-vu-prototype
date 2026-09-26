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
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Progress;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Reconciliation;
import vn.dongthanh.vsmt.remittance.service.PeriodLockService;

/** Viết trước (TDD) cho T32: khóa kỳ bị chặn khi còn công ty nợ (G15, R19), khóa được khi hết nợ (G1). */
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
        october = CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg);
        ReflectionTestUtils.setField(october, "id", 10L);
        october.startCollecting();
        when(periods.findByIdForUpdate(10L)).thenReturn(Optional.of(october));
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
        when(ledger.companiesWithDebt(10L)).thenReturn(List.of());
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

    private static LedgerRow debt(String code, long remaining) {
        return new LedgerRow(1L, code, "Công ty " + code, 10L, remaining, 1, 0, 0, 0, remaining, 0, 0, false, 0, true,
                Progress.NOT_PAID, Reconciliation.PENDING);
    }
}
