package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.BeanUtils;
import org.springframework.security.access.AccessDeniedException;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodAutoRule;
import vn.dongthanh.vsmt.masterdata.domain.PeriodAutoRuleRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService.DraftRun;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService.RuleCommand;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService.Target;
import vn.dongthanh.vsmt.masterdata.service.TariffService;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.domain.RecipientType;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Tự tạo kỳ dự thảo (04/10/2026): ngày tới hạn, kỳ tháng/quý, không tạo trùng, báo cán bộ xã, quyền quản trị. */
class PeriodAutoServiceTest {

    final PeriodAutoRuleRepository rules = mock(PeriodAutoRuleRepository.class);
    final CollectionPeriodRepository periods = mock(CollectionPeriodRepository.class);
    final TariffService tariffs = mock(TariffService.class);
    final AuditService audit = mock(AuditService.class);
    final NotificationService notifications = mock(NotificationService.class);
    // 25/10/2026 07:30 giờ Việt Nam.
    final Clock clock = Clock.fixed(Instant.parse("2026-10-25T00:30:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final PeriodAutoService service = new PeriodAutoService(rules, periods, tariffs, audit, notifications, clock);

    final CurrentUser admin = new CurrentUser(1L, "admin", Role.ADMIN, null);
    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    final TariffVersion bg65 = TariffVersion.create("BG-65-2026", "QĐ 65/2026/QĐ-UBND", LocalDate.of(2026, 9, 1),
            LocalDate.of(2027, 6, 30), TariffStatus.ACTIVE);

    PeriodAutoRule rule;

    static PeriodAutoRule rule(boolean enabled, PeriodType type, int createDay, int householdDays, int remitDays) {
        PeriodAutoRule r = BeanUtils.instantiateClass(PeriodAutoRule.class);
        r.update(enabled, type, createDay, householdDays, remitDays, OffsetDateTime.parse("2026-10-01T00:00:00Z"), 1L);
        return r;
    }

    @BeforeEach
    void setUp() {
        rule = rule(true, PeriodType.MONTH, 25, 15, 10);
        when(rules.findById(PeriodAutoRule.ID)).thenAnswer(inv -> Optional.of(rule));
        when(periods.save(any(CollectionPeriod.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tariffs.activeVersionOn(any())).thenReturn(bg65);
    }

    // ---- ngày tới hạn ----

    @Test
    void monthlyRuleTargetsNextMonthFromCreateDay() {
        PeriodAutoRule r = rule(true, PeriodType.MONTH, 25, 15, 10);

        assertThat(PeriodAutoService.targetOn(LocalDate.of(2026, 10, 24), r)).isEmpty();
        Target t = PeriodAutoService.targetOn(LocalDate.of(2026, 10, 25), r).orElseThrow();
        assertThat(t.type()).isEqualTo(PeriodType.MONTH);
        assertThat(t.year()).isEqualTo(2026);
        assertThat(t.number()).isEqualTo(11);
        assertThat(t.start()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(t.end()).isEqualTo(LocalDate.of(2026, 11, 30));
        // Quá ngày tạo vẫn tạo bù, không chỉ đúng ngày đó.
        assertThat(PeriodAutoService.targetOn(LocalDate.of(2026, 10, 31), r)).isPresent();
    }

    @Test
    void decemberRollsOverToJanuaryOfNextYear() {
        Target t = PeriodAutoService.targetOn(LocalDate.of(2026, 12, 28), rule(true, PeriodType.MONTH, 25, 15, 10))
                .orElseThrow();

        assertThat(t.year()).isEqualTo(2027);
        assertThat(t.number()).isEqualTo(1);
        assertThat(t.end()).isEqualTo(LocalDate.of(2027, 1, 31));
    }

    @Test
    void quarterlyRuleOnlyActsInLastMonthOfQuarter() {
        PeriodAutoRule r = rule(true, PeriodType.QUARTER, 20, 15, 10);

        assertThat(PeriodAutoService.targetOn(LocalDate.of(2026, 10, 25), r)).isEmpty();
        assertThat(PeriodAutoService.targetOn(LocalDate.of(2026, 11, 25), r)).isEmpty();
        assertThat(PeriodAutoService.targetOn(LocalDate.of(2026, 12, 19), r)).isEmpty();
        Target t = PeriodAutoService.targetOn(LocalDate.of(2026, 12, 20), r).orElseThrow();
        assertThat(t.type()).isEqualTo(PeriodType.QUARTER);
        assertThat(t.year()).isEqualTo(2027);
        assertThat(t.number()).isEqualTo(1);
        assertThat(t.start()).isEqualTo(LocalDate.of(2027, 1, 1));
        assertThat(t.end()).isEqualTo(LocalDate.of(2027, 3, 31));
        assertThat(PeriodAutoService.targetOn(LocalDate.of(2026, 9, 25), r).orElseThrow().number()).isEqualTo(4);
    }

    // ---- tạo dự thảo ----

    @Test
    void createsDraftForNextMonthWithRemitDueFromRule() {
        DraftRun run = service.createDraftIfDue(null);

        CollectionPeriod p = run.created();
        assertThat(p).isNotNull();
        assertThat(p.getCode()).isEqualTo("2026-11");
        assertThat(p.getStatus()).isEqualTo(PeriodStatus.DRAFT);
        assertThat(p.getStartDate()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(p.getOpenDate()).isEqualTo(LocalDate.of(2026, 11, 1));
        // Cuối kỳ 30/11 + 10 ngày.
        assertThat(p.getDueDate()).isEqualTo(LocalDate.of(2026, 12, 10));
        assertThat(p.getTariffVersion()).isSameAs(bg65);
        verify(tariffs).activeVersionOn(LocalDate.of(2026, 11, 1));
        verify(audit).recordSystem(eq("CREATE_DRAFT_PERIOD"), eq("CollectionPeriod"), eq("2026-11"), isNull(), any());
    }

    @Test
    void notifiesCommuneOfficersWhenDraftIsCreated() {
        service.createDraftIfDue(null);

        ArgumentCaptor<NotificationCommand> cmd = ArgumentCaptor.forClass(NotificationCommand.class);
        verify(notifications).publish(cmd.capture(), isNull());
        assertThat(cmd.getValue().type()).isEqualTo(RecipientType.ROLE);
        assertThat(cmd.getValue().role()).isEqualTo(Role.COMMUNE_OFFICER);
        assertThat(cmd.getValue().kind()).isEqualTo(NotificationKind.INFO);
        assertThat(cmd.getValue().title()).contains("Tháng 11/2026");
        assertThat(cmd.getValue().link()).containsEntry("screen", "commune.periodDrafts");
    }

    @Test
    void manualRunIsAuditedUnderTheAdmin() {
        service.runNow(admin);

        verify(audit).record(eq(admin), eq("CREATE_DRAFT_PERIOD"), eq("CollectionPeriod"), eq("2026-11"), isNull(),
                any());
        verify(audit, never()).recordSystem(any(), any(), any(), any(), any());
    }

    @Test
    void doesNothingWhenRuleIsOff() {
        rule = rule(false, PeriodType.MONTH, 25, 15, 10);

        DraftRun run = service.createDraftIfDue(null);

        assertThat(run.created()).isNull();
        assertThat(run.message()).contains("đang tắt");
        verify(periods, never()).save(any());
        verify(notifications, never()).publish(any(), any());
    }

    @Test
    void doesNothingBeforeCreateDay() {
        rule = rule(true, PeriodType.MONTH, 26, 15, 10);

        DraftRun run = service.createDraftIfDue(null);

        assertThat(run.created()).isNull();
        assertThat(run.message()).contains("ngày 26");
        verify(periods, never()).save(any());
    }

    @Test
    void doesNotCreateTheSamePeriodTwice() {
        when(periods.existsByCode("2026-11")).thenReturn(true);

        DraftRun run = service.createDraftIfDue(null);

        assertThat(run.created()).isNull();
        assertThat(run.message()).contains("2026-11").contains("đã có");
        verify(periods, never()).save(any());
        verify(notifications, never()).publish(any(), any());
    }

    @Test
    void reportsMissingTariffInsteadOfCreatingADraftWithoutPrice() {
        when(tariffs.activeVersionOn(any())).thenThrow(new BusinessRuleException("TARIFF_NOT_FOUND",
                "Không có biểu giá có hiệu lực vào ngày 01/11/2026."));

        DraftRun run = service.createDraftIfDue(null);

        assertThat(run.created()).isNull();
        assertThat(run.message()).contains("Tháng 11/2026").contains("biểu giá");
        verify(periods, never()).save(any());
    }

    @Test
    void dailyJobSwallowsFailuresSoTomorrowStillRuns() {
        when(rules.findById(PeriodAutoRule.ID)).thenReturn(Optional.empty());

        service.runDaily();

        verify(periods, never()).save(any());
    }

    // ---- quy tắc ----

    @Test
    void onlyAdminMayReadRunOrChangeTheRule() {
        RuleCommand cmd = new RuleCommand(true, PeriodType.MONTH, 25, 15, 10);

        assertThatThrownBy(() -> service.rule(officer)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.updateRule(cmd, officer)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.runNow(officer)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void draftsAreVisibleToOfficerAndAdminOnly() {
        service.drafts(officer);
        service.drafts(admin);
        verify(periods, org.mockito.Mockito.times(2)).findDraftsWithTariff();

        CurrentUser collector = new CurrentUser(21L, "thu07", Role.COLLECTOR, 1L);
        assertThatThrownBy(() -> service.drafts(collector)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void updateRuleSavesAndAudits() {
        PeriodAutoRule updated = service.updateRule(new RuleCommand(true, PeriodType.QUARTER, 20, 30, 5), admin);

        assertThat(updated.getPeriodType()).isEqualTo(PeriodType.QUARTER);
        assertThat(updated.getCreateDay()).isEqualTo(20);
        assertThat(updated.getHouseholdDueDays()).isEqualTo(30);
        assertThat(updated.getRemitDueDays()).isEqualTo(5);
        assertThat(updated.getUpdatedBy()).isEqualTo(1L);
        verify(audit).record(eq(admin), eq("UPDATE_PERIOD_RULE"), eq("PeriodAutoRule"), eq(1), any(), any());
    }

    @Test
    void rejectsInvalidRuleValues() {
        assertThatThrownBy(() -> service.updateRule(new RuleCommand(true, PeriodType.MONTH, 0, 15, 10), admin))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("Ngày tạo kỳ");
        assertThatThrownBy(() -> service.updateRule(new RuleCommand(true, PeriodType.MONTH, 29, 15, 10), admin))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("Ngày tạo kỳ");
        assertThatThrownBy(() -> service.updateRule(new RuleCommand(true, PeriodType.MONTH, 25, 0, 10), admin))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("hộ đóng");
        assertThatThrownBy(() -> service.updateRule(new RuleCommand(true, PeriodType.MONTH, 25, 15, -1), admin))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("công ty nộp xã");
        assertThatThrownBy(() -> service.updateRule(new RuleCommand(true, null, 25, 15, 10), admin))
                .isInstanceOf(BusinessRuleException.class);
        verify(audit, never()).record(any(), any(), any(), any(), any(), any());
    }
}
