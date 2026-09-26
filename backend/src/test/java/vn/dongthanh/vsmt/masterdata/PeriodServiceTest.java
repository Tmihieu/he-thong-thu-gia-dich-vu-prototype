package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.service.PeriodService;
import vn.dongthanh.vsmt.masterdata.service.PeriodService.OpenPeriodCommand;
import vn.dongthanh.vsmt.masterdata.service.TariffService;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Viết trước (TDD) cho T11: mở kỳ tháng/quý, chặn trùng, chặn chuyển trạng thái sai, gắn đúng biểu giá. */
class PeriodServiceTest {

    final CollectionPeriodRepository periods = mock(CollectionPeriodRepository.class);
    final TariffService tariffs = mock(TariffService.class);
    final AuditService audit = mock(AuditService.class);
    final PeriodService service = new PeriodService(periods, tariffs, audit,
            java.time.Clock.systemDefaultZone());

    final CurrentUser admin = new CurrentUser(1L, "admin", Role.ADMIN, null);
    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);

    final TariffVersion bg65 = TariffVersion.create("BG-65-2026", "QĐ 65/2026/QĐ-UBND", LocalDate.of(2026, 9, 1),
            LocalDate.of(2027, 6, 30), TariffStatus.ACTIVE);
    final TariffVersion bg67 = TariffVersion.create("BG-67-2025", "QĐ 67/2025/QĐ-UBND", LocalDate.of(2025, 6, 1),
            LocalDate.of(2026, 8, 31), TariffStatus.EXPIRED);

    @BeforeEach
    void setUp() {
        when(periods.save(any(CollectionPeriod.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tariffs.activeVersionOn(any())).thenAnswer(inv -> {
            LocalDate d = inv.getArgument(0);
            return d.isBefore(LocalDate.of(2026, 9, 1)) ? bg67 : bg65;
        });
    }

    @Test
    void opensMonthPeriodWithDerivedCodeLabelAndDates() {
        CollectionPeriod p = service.open(new OpenPeriodCommand(PeriodType.MONTH, 2026, 10, null,
                LocalDate.of(2026, 10, 31), null), admin);

        assertThat(p.getCode()).isEqualTo("2026-10");
        assertThat(p.getLabel()).isEqualTo("Tháng 10/2026");
        assertThat(p.getStartDate()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(p.getEndDate()).isEqualTo(LocalDate.of(2026, 10, 31));
        assertThat(p.getOpenDate()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(p.getDueDate()).isEqualTo(LocalDate.of(2026, 10, 31));
        assertThat(p.getStatus()).isEqualTo(PeriodStatus.OPEN);
        verify(audit).record(eq(admin), eq("OPEN_PERIOD"), eq("CollectionPeriod"), eq("2026-10"), eq(null), any());
    }

    @Test
    void opensQuarterPeriod() {
        CollectionPeriod p = service.open(new OpenPeriodCommand(PeriodType.QUARTER, 2026, 4,
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 12, 31), "Thu theo quý"), admin);

        assertThat(p.getCode()).isEqualTo("2026-Q4");
        assertThat(p.getLabel()).isEqualTo("Quý 4/2026");
        assertThat(p.getStartDate()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(p.getEndDate()).isEqualTo(LocalDate.of(2026, 12, 31));
        assertThat(p.getOpenDate()).isEqualTo(LocalDate.of(2026, 10, 5));
        assertThat(p.getNote()).isEqualTo("Thu theo quý");
    }

    @Test
    void februaryAndFirstQuarterEndOnTheRightDay() {
        assertThat(service.open(new OpenPeriodCommand(PeriodType.MONTH, 2028, 2, null, LocalDate.of(2028, 3, 10),
                null), admin).getEndDate()).isEqualTo(LocalDate.of(2028, 2, 29));
        assertThat(service.open(new OpenPeriodCommand(PeriodType.QUARTER, 2027, 1, null, LocalDate.of(2027, 3, 31),
                null), admin).getEndDate()).isEqualTo(LocalDate.of(2027, 3, 31));
    }

    @Test
    void openingTheSamePeriodTwiceIsBlocked() {
        when(periods.existsByCode("2026-10")).thenReturn(true);

        assertThatThrownBy(() -> service.open(new OpenPeriodCommand(PeriodType.MONTH, 2026, 10, null,
                LocalDate.of(2026, 10, 31), null), admin))
                .isInstanceOf(ConflictException.class)
                .extracting("code").isEqualTo("PERIOD_ALREADY_EXISTS");
        verify(periods, never()).save(any());
        verify(audit, never()).record(any(), anyString(), anyString(), any(), any(), any());
    }

    @Test
    void attachesTariffVersionInEffectOnPeriodStartDate() {
        CollectionPeriod aug = service.open(new OpenPeriodCommand(PeriodType.MONTH, 2026, 8, null,
                LocalDate.of(2026, 8, 31), null), admin);
        CollectionPeriod oct = service.open(new OpenPeriodCommand(PeriodType.MONTH, 2026, 10, LocalDate.of(2026, 9, 28),
                LocalDate.of(2026, 10, 31), null), admin);

        assertThat(aug.getTariffVersion()).isSameAs(bg67);
        assertThat(oct.getTariffVersion()).isSameAs(bg65);
        verify(tariffs).activeVersionOn(LocalDate.of(2026, 10, 1));
    }

    @Test
    void startCollectingMovesOpenToCollectingAndAudits() {
        CollectionPeriod p = openOctober();
        when(periods.findByIdWithTariff(10L)).thenReturn(Optional.of(p));

        service.startCollecting(10L, admin);

        assertThat(p.getStatus()).isEqualTo(PeriodStatus.COLLECTING);
        verify(audit).record(eq(admin), eq("START_COLLECTING_PERIOD"), eq("CollectionPeriod"), eq("2026-10"), any(),
                any());
    }

    @Test
    void invalidTransitionIsRejectedWith422Code() {
        CollectionPeriod p = openOctober();
        p.startCollecting();
        when(periods.findByIdWithTariff(10L)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.startCollecting(10L, admin))
                .isExactlyInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Đang thu")
                .extracting("code").isEqualTo("PERIOD_INVALID_TRANSITION");
    }

    @Test
    void dueDateBeforeOpenDateIsRejected() {
        assertThatThrownBy(() -> service.open(new OpenPeriodCommand(PeriodType.MONTH, 2026, 10,
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 4), null), admin))
                .isExactlyInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("PERIOD_DUE_BEFORE_OPEN");
    }

    @Test
    void monthAndQuarterNumbersMustBeInRange() {
        assertThatThrownBy(() -> service.open(new OpenPeriodCommand(PeriodType.MONTH, 2026, 13, null,
                LocalDate.of(2026, 12, 31), null), admin)).extracting("code").isEqualTo("PERIOD_NUMBER_INVALID");
        assertThatThrownBy(() -> service.open(new OpenPeriodCommand(PeriodType.QUARTER, 2026, 5, null,
                LocalDate.of(2026, 12, 31), null), admin)).extracting("code").isEqualTo("PERIOD_NUMBER_INVALID");
    }

    @Test
    void onlyAdminOpensAndStartsPeriods() {
        assertThatThrownBy(() -> service.open(new OpenPeriodCommand(PeriodType.MONTH, 2026, 10, null,
                LocalDate.of(2026, 10, 31), null), officer)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.startCollecting(10L, officer)).isInstanceOf(AccessDeniedException.class);
    }

    private CollectionPeriod openOctober() {
        return service.open(new OpenPeriodCommand(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), null),
                admin);
    }
}
