package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceipt;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceiptRepository;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;

/** Viết trước (TDD) cho T26: R15 số tiền phiếu thu, cộng dồn, kỳ khóa, phân quyền, mã phiếu. */
class CompanyReceiptServiceTest {

    final CompanyReceiptRepository receipts = mock(CompanyReceiptRepository.class);
    final CollectionPeriodRepository periods = mock(CollectionPeriodRepository.class);
    final CompanyRepository companies = mock(CompanyRepository.class);
    final CompanyLedgerService ledger = mock(CompanyLedgerService.class);
    final AuditService audit = mock(AuditService.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-10-15T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final CompanyReceiptService service = new CompanyReceiptService(receipts, periods, companies, ledger, audit, clock);

    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    final List<CompanyReceipt> stored = new ArrayList<>();
    CollectionPeriod october;
    long due = 1_600_000;

    @BeforeEach
    void setUp() {
        TariffVersion bg = TariffVersion.create("BG", "QĐ", LocalDate.of(2026, 9, 1), null, TariffStatus.ACTIVE);
        october = CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg);
        ReflectionTestUtils.setField(october, "id", 10L);
        Company dv01 = Company.create("DV01", "Công ty Một", "Trần Văn Mẫu", "0900000001", LocalDate.of(2026, 1, 1));
        ReflectionTestUtils.setField(dv01, "id", 1L);
        when(periods.findByIdForUpdate(10L)).thenReturn(Optional.of(october));
        when(companies.findById(1L)).thenReturn(Optional.of(dv01));
        when(ledger.remaining(1L, 10L)).thenAnswer(inv -> due - stored.stream().mapToLong(CompanyReceipt::getAmount).sum());
        when(receipts.maxCodeNumber("PT-CT-1026-")).thenAnswer(inv -> stored.size());
        when(receipts.save(any(CompanyReceipt.class))).thenAnswer(inv -> {
            stored.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
    }

    @Test
    void issuesReceiptWithSequentialCodeDefaultsAndAudit() {
        CompanyReceipt r = service.issue(cmd(1_000_000), officer);

        assertThat(r.getCode()).isEqualTo("PT-CT-1026-001");
        assertThat(r.getPayerName()).isEqualTo("Trần Văn Mẫu");
        assertThat(r.getReceiptDate()).isEqualTo(LocalDate.of(2026, 10, 15));
        verify(audit).record(eq(officer), eq("ISSUE_COMPANY_RECEIPT"), eq("CompanyReceipt"), eq("PT-CT-1026-001"),
                eq(null), any());
    }

    @Test
    void amountAboveRemainingIs422WithRemainingInMessage() {
        assertThatThrownBy(() -> service.issue(cmd(1_600_001), officer))
                .hasMessageContaining("1.600.000")
                .extracting("code").isEqualTo("RECEIPT_AMOUNT_OUT_OF_RANGE");
        verify(receipts, never()).save(any());
    }

    @Test
    void zeroOrNegativeAmountIs422() {
        assertThatThrownBy(() -> service.issue(cmd(0), officer)).extracting("code").isEqualTo("RECEIPT_AMOUNT_OUT_OF_RANGE");
        assertThatThrownBy(() -> service.issue(cmd(-1), officer)).extracting("code").isEqualTo("RECEIPT_AMOUNT_OUT_OF_RANGE");
    }

    @Test
    void twoPaymentsForThePeriodAccumulateAndThirdCannotExceed() {
        service.issue(cmd(1_000_000), officer);
        CompanyReceipt second = service.issue(cmd(600_000), officer);

        assertThat(second.getCode()).isEqualTo("PT-CT-1026-002");
        assertThat(stored).extracting(CompanyReceipt::getAmount).containsExactly(1_000_000L, 600_000L);
        assertThatThrownBy(() -> service.issue(cmd(1), officer)).extracting("code").isEqualTo("RECEIPT_AMOUNT_OUT_OF_RANGE");
    }

    @Test
    void lockedPeriodAndFutureDateAre422() {
        assertThatThrownBy(() -> service.issue(new IssueReceiptCommand(1L, 10L, 100_000, ReceiptMethod.CASH,
                LocalDate.of(2026, 10, 16), null, null, null), officer)).extracting("code").isEqualTo("RECEIPT_DATE_INVALID");
        ReflectionTestUtils.setField(october, "status", PeriodStatus.LOCKED);
        assertThatThrownBy(() -> service.issue(cmd(100_000), officer)).extracting("code").isEqualTo("PERIOD_LOCKED");
    }

    @Test
    void onlyCommuneOfficerIssues() {
        assertThatThrownBy(() -> service.issue(cmd(100_000), new CurrentUser(5L, "dv01", Role.COMPANY_MANAGER, 1L)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.issue(cmd(100_000), new CurrentUser(1L, "admin", Role.ADMIN, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    private IssueReceiptCommand cmd(long amount) {
        return new IssueReceiptCommand(1L, 10L, amount, ReceiptMethod.TRANSFER, null, null, "VCB-1", null);
    }
}
