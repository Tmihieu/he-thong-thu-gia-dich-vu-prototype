package vn.dongthanh.vsmt.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.beans.BeanUtils;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueCommand;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueResult;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService.DraftPreview;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService.PublishResult;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodAutoRule;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService;
import vn.dongthanh.vsmt.masterdata.service.TariffService;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Mở kỳ dự thảo (04/10/2026): xem trước, mở kỳ + phát hành một bước, hạn hộ đóng mặc định, tránh mở hai lần. */
class PeriodPublishServiceTest {

    final CollectionPeriodRepository periods = mock(CollectionPeriodRepository.class);
    final FeeTypeRepository feeTypes = mock(FeeTypeRepository.class);
    final TariffService tariffs = mock(TariffService.class);
    final PeriodAutoService auto = mock(PeriodAutoService.class);
    final ChargeRequestService chargeRequests = mock(ChargeRequestService.class);
    final AuditService audit = mock(AuditService.class);
    // 28/10/2026 09:00 giờ Việt Nam.
    final Clock clock = Clock.fixed(Instant.parse("2026-10-28T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final PeriodPublishService service = new PeriodPublishService(periods, feeTypes, tariffs, auto, chargeRequests,
            audit, clock);

    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    final TariffVersion bg65 = tariff(10L, "BG-65-2026");
    final FeeType env = FeeType.create("ENV", "Phí vệ sinh môi trường", PricingMode.TARIFF, null);
    final IssueResult issued = new IssueResult("YCT-1126-01", 120, 3, 9_600_000L, 0, List.of());
    CollectionPeriod draft;

    static TariffVersion tariff(Long id, String code) {
        TariffVersion v = TariffVersion.create(code, "QĐ", LocalDate.of(2026, 9, 1), LocalDate.of(2027, 6, 30),
                TariffStatus.ACTIVE);
        ReflectionTestUtils.setField(v, "id", id);
        return v;
    }

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(env, "id", 1L);
        draft = CollectionPeriod.draft(PeriodType.MONTH, 2026, 11, LocalDate.of(2026, 12, 10), bg65);
        ReflectionTestUtils.setField(draft, "id", 77L);
        PeriodAutoRule rule = BeanUtils.instantiateClass(PeriodAutoRule.class);
        rule.update(true, PeriodType.MONTH, 25, 15, 10, OffsetDateTime.parse("2026-10-01T00:00:00Z"), 1L);
        when(auto.currentRule()).thenReturn(rule);
        when(periods.findByIdForUpdate(77L)).thenAnswer(inv -> Optional.of(draft));
        when(periods.findByIdWithTariff(77L)).thenAnswer(inv -> Optional.of(draft));
        when(periods.saveAndFlush(any(CollectionPeriod.class))).thenAnswer(inv -> inv.getArgument(0));
        when(feeTypes.findByCode("ENV")).thenReturn(Optional.of(env));
        when(tariffs.activeVersionOn(LocalDate.of(2026, 11, 1))).thenReturn(bg65);
        when(chargeRequests.publish(any(), any())).thenReturn(issued);
        when(chargeRequests.previewDraft(any(), any())).thenReturn(
                new IssueResult(null, 120, 3, 9_600_000L, 0, List.of()));
    }

    @Test
    void publishOpensThePeriodAndIssuesTheEnvRequestForTheWholeCommune() {
        PublishResult r = service.publish(77L, null, null, null, "Kỳ tháng 11", officer);

        assertThat(r.period().getStatus()).isEqualTo(PeriodStatus.COLLECTING);
        assertThat(r.result()).isSameAs(issued);
        ArgumentCaptor<IssueCommand> cmd = ArgumentCaptor.forClass(IssueCommand.class);
        verify(chargeRequests).publish(cmd.capture(), eq(officer));
        assertThat(cmd.getValue().periodId()).isEqualTo(77L);
        assertThat(cmd.getValue().feeTypeId()).isEqualTo(1L);
        assertThat(cmd.getValue().scopeType()).isEqualTo(ChargeScope.ALL);
        assertThat(cmd.getValue().unitPrice()).isNull();
        assertThat(cmd.getValue().note()).isEqualTo("Kỳ tháng 11");
        verify(audit).record(eq(officer), eq("PUBLISH_PERIOD"), eq("CollectionPeriod"), eq("2026-11"), any(), any());
    }

    @Test
    void periodIsFlushedAsCollectingBeforeChargesAreIssued() {
        service.publish(77L, null, null, null, null, officer);

        // PeriodGuard đọc lại trạng thái kỳ từ CSDL: phải thấy COLLECTING trước khi phát hành khoản.
        InOrder order = inOrder(periods, chargeRequests);
        order.verify(periods).saveAndFlush(draft);
        order.verify(chargeRequests).publish(any(), any());
    }

    @Test
    void defaultHouseholdDueIsIssueDatePlusRuleDays() {
        // Ngày mở 01/11 sau hôm nay 28/10: tính từ ngày mở. 01/11 + 15 ngày = 16/11.
        service.publish(77L, null, null, null, null, officer);

        ArgumentCaptor<IssueCommand> cmd = ArgumentCaptor.forClass(IssueCommand.class);
        verify(chargeRequests).publish(cmd.capture(), any());
        assertThat(cmd.getValue().dueDate()).isEqualTo(LocalDate.of(2026, 11, 16));
    }

    @Test
    void defaultHouseholdDueStartsFromTodayWhenOpenedLate() {
        // Mở muộn: hôm nay 28/10 là sau ngày mở 20/10 (kỳ tháng 10 dự thảo), tính từ hôm nay.
        draft = CollectionPeriod.draft(PeriodType.MONTH, 2026, 10, LocalDate.of(2026, 11, 10), bg65);
        ReflectionTestUtils.setField(draft, "id", 77L);
        when(tariffs.activeVersionOn(LocalDate.of(2026, 10, 1))).thenReturn(bg65);

        service.publish(77L, null, null, null, null, officer);

        ArgumentCaptor<IssueCommand> cmd = ArgumentCaptor.forClass(IssueCommand.class);
        verify(chargeRequests).publish(cmd.capture(), any());
        // 28/10 + 15 = 12/11, nhưng không được quá hạn công ty nộp xã 10/11.
        assertThat(cmd.getValue().dueDate()).isEqualTo(LocalDate.of(2026, 11, 10));
    }

    @Test
    void householdDueChosenByOfficerIsUsedAsIs() {
        service.publish(77L, null, null, LocalDate.of(2026, 11, 20), null, officer);

        ArgumentCaptor<IssueCommand> cmd = ArgumentCaptor.forClass(IssueCommand.class);
        verify(chargeRequests).publish(cmd.capture(), any());
        assertThat(cmd.getValue().dueDate()).isEqualTo(LocalDate.of(2026, 11, 20));
    }

    @Test
    void publishRefreshesTheTariffIfANewerOneNowCoversTheFirstDay() {
        TariffVersion bg70 = tariff(11L, "BG-70-2026");
        when(tariffs.activeVersionOn(LocalDate.of(2026, 11, 1))).thenReturn(bg70);

        service.publish(77L, null, null, null, null, officer);

        assertThat(draft.getTariffVersion()).isSameAs(bg70);
    }

    @Test
    void anAlreadyOpenedPeriodCannotBePublishedAgain() {
        draft.publish();

        assertThatThrownBy(() -> service.publish(77L, null, null, null, null, officer))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("không còn ở dạng dự thảo");
        verify(chargeRequests, never()).publish(any(), any());
        verify(audit, never()).record(any(), any(), any(), any(), any(), any());
    }

    @Test
    void failureWhileIssuingChargesPropagatesSoTheTransactionRollsBack() {
        when(chargeRequests.publish(any(), any())).thenThrow(new BusinessRuleException("CHARGE_AMOUNT_TOO_LARGE", "x"));

        assertThatThrownBy(() -> service.publish(77L, null, null, null, null, officer)).isInstanceOf(BusinessRuleException.class);
        verify(audit, never()).record(any(), any(), any(), any(), any(), any());
    }

    @Test
    void missingEnvFeeTypeIsReported() {
        when(feeTypes.findByCode("ENV")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.publish(77L, null, null, null, null, officer)).isInstanceOf(NotFoundException.class)
                .hasMessageContaining("ENV");
        assertThat(draft.getStatus()).isEqualTo(PeriodStatus.DRAFT);
    }

    @Test
    void unknownPeriodIsNotFound() {
        assertThatThrownBy(() -> service.publish(5L, null, null, null, null, officer)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.preview(5L, null, null, null, officer)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void previewUsesTheDraftPathAndReturnsTheDueDateItAssumed() {
        DraftPreview p = service.preview(77L, null, null, null, officer);

        assertThat(p.dueDate()).isEqualTo(LocalDate.of(2026, 11, 16));
        assertThat(p.result().chargeCount()).isEqualTo(120);
        assertThat(p.result().requestCode()).isNull();
        verify(chargeRequests).previewDraft(any(), eq(officer));
        verify(chargeRequests, never()).publish(any(), any());
        assertThat(draft.getStatus()).isEqualTo(PeriodStatus.DRAFT);
    }

    @Test
    void previewOfAnOpenPeriodIsRejected() {
        draft.publish();

        assertThatThrownBy(() -> service.preview(77L, null, null, null, officer)).isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("không còn ở dạng dự thảo");
    }

    @Test
    void onlyCommuneOfficerMayPreviewOrPublish() {
        CurrentUser admin = new CurrentUser(1L, "admin", Role.ADMIN, null);

        assertThatThrownBy(() -> service.publish(77L, null, null, null, null, admin)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.preview(77L, null, null, null, admin)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void officerSetsOpenDateAndCompanyDueDateBeforePublishing() {
        service.publish(77L, LocalDate.of(2026, 11, 5), LocalDate.of(2026, 12, 20), null, null, officer);

        assertThat(draft.getOpenDate()).isEqualTo(LocalDate.of(2026, 11, 5));
        assertThat(draft.getDueDate()).isEqualTo(LocalDate.of(2026, 12, 20));
    }

    @Test
    void companyDueDateBeforeOpenDateIsRejected() {
        assertThatThrownBy(() -> service.publish(77L, LocalDate.of(2026, 11, 5), LocalDate.of(2026, 11, 4), null, null,
                officer)).isInstanceOf(BusinessRuleException.class);
        verify(chargeRequests, never()).publish(any(), any());
    }
}
