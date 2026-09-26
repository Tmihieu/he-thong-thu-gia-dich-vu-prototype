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
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.domain.RecipientType;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;
import vn.dongthanh.vsmt.remittance.domain.PaymentReminder;
import vn.dongthanh.vsmt.remittance.domain.PaymentReminderRepository;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService.PeriodDebt;
import vn.dongthanh.vsmt.remittance.service.ReminderService;
import vn.dongthanh.vsmt.remittance.service.ReminderService.CreateReminderCommand;
import vn.dongthanh.vsmt.remittance.service.ReminderService.ReminderDraft;

/** Viết trước (TDD) cho T34: nhắc nộp chỉ khi có nợ quá hạn (R16), hạn +5 ngày, thông báo tới công ty. */
class ReminderServiceTest {

    final PaymentReminderRepository reminders = mock(PaymentReminderRepository.class);
    final CompanyRepository companies = mock(CompanyRepository.class);
    final CompanyLedgerService ledger = mock(CompanyLedgerService.class);
    final NotificationService notifications = mock(NotificationService.class);
    final AuditService audit = mock(AuditService.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-11-03T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final ReminderService service = new ReminderService(reminders, companies, ledger, notifications, audit, clock);

    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    CollectionPeriod sept;
    CollectionPeriod oct;

    @BeforeEach
    void setUp() {
        TariffVersion bg = TariffVersion.create("BG", "QĐ", LocalDate.of(2026, 9, 1), null, TariffStatus.ACTIVE);
        sept = period(9, "2026-09-30", 9L, bg);
        oct = period(10, "2026-10-31", 10L, bg);
        Company dv01 = Company.create("DV01", "Công ty MTĐT Đông Thạnh", "A", "0900000001", LocalDate.of(2026, 1, 1));
        ReflectionTestUtils.setField(dv01, "id", 1L);
        when(companies.findById(1L)).thenReturn(Optional.of(dv01));
        when(reminders.save(any(PaymentReminder.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reminders.maxCodeNumber()).thenReturn(4);
    }

    @Test
    void draftSumsOverdueDebtsWithDefaultDueDatePlusFiveDays() {
        when(ledger.overdueDebtsOf(1L)).thenReturn(List.of(new PeriodDebt(sept, 500_000), new PeriodDebt(oct, 1_200_000)));

        ReminderDraft d = service.draft(1L, officer);

        assertThat(d.amount()).isEqualTo(1_700_000);
        assertThat(d.dueDate()).isEqualTo(LocalDate.of(2026, 11, 8));
        assertThat(d.debts()).hasSize(2);
        assertThat(d.content()).contains("Công ty MTĐT Đông Thạnh").contains("1.700.000 đ").contains("08/11/2026")
                .contains("Tháng 09/2026").contains("Tháng 10/2026");
    }

    @Test
    void companyWithoutOverdueDebtCannotBeReminded() {
        when(ledger.overdueDebtsOf(1L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.create(new CreateReminderCommand(1L, null, null, null), officer))
                .extracting("code").isEqualTo("NO_OVERDUE_DEBT");
        verify(reminders, never()).save(any());
        verify(notifications, never()).publish(any(), any());
    }

    @Test
    void createSavesReminderNotifiesCompanyAndAudits() {
        when(ledger.overdueDebtsOf(1L)).thenReturn(List.of(new PeriodDebt(sept, 500_000), new PeriodDebt(oct, 1_200_000)));

        PaymentReminder r = service.create(new CreateReminderCommand(1L, List.of(10L), LocalDate.of(2026, 11, 10),
                "Đề nghị nộp gấp kỳ 10"), officer);

        assertThat(r.getCode()).isEqualTo("NN-005");
        assertThat(r.getAmount()).isEqualTo(1_200_000);
        assertThat(r.getPeriods()).containsExactly(oct);
        assertThat(r.getDueDate()).isEqualTo(LocalDate.of(2026, 11, 10));
        assertThat(r.getReminderDate()).isEqualTo(LocalDate.of(2026, 11, 3));
        ArgumentCaptor<NotificationCommand> sent = ArgumentCaptor.forClass(NotificationCommand.class);
        verify(notifications).publish(sent.capture(), eq(2L));
        assertThat(sent.getValue().type()).isEqualTo(RecipientType.COMPANY);
        assertThat(sent.getValue().companyId()).isEqualTo(1L);
        assertThat(sent.getValue().kind()).isEqualTo(NotificationKind.REMINDER);
        assertThat(sent.getValue().body()).isEqualTo("Đề nghị nộp gấp kỳ 10");
        verify(audit).record(eq(officer), eq("CREATE_PAYMENT_REMINDER"), eq("PaymentReminder"), eq("NN-005"), eq(null), any());
    }

    @Test
    void selectedPeriodMustBeOverdueAndDueDateNotInThePast() {
        when(ledger.overdueDebtsOf(1L)).thenReturn(List.of(new PeriodDebt(sept, 500_000)));

        assertThatThrownBy(() -> service.create(new CreateReminderCommand(1L, List.of(10L), null, null), officer))
                .extracting("code").isEqualTo("REMINDER_PERIOD_INVALID");
        assertThatThrownBy(() -> service.create(new CreateReminderCommand(1L, null, LocalDate.of(2026, 11, 2), null), officer))
                .extracting("code").isEqualTo("REMINDER_DUE_DATE_INVALID");
    }

    @Test
    void onlyCommuneOfficerReminds() {
        assertThatThrownBy(() -> service.create(new CreateReminderCommand(1L, null, null, null),
                new CurrentUser(5L, "dv01", Role.COMPANY_MANAGER, 1L))).isInstanceOf(AccessDeniedException.class);
    }

    private static CollectionPeriod period(int month, String due, Long id, TariffVersion bg) {
        CollectionPeriod p = CollectionPeriod.open(PeriodType.MONTH, 2026, month, null, LocalDate.parse(due), bg);
        ReflectionTestUtils.setField(p, "id", id);
        return p;
    }
}
