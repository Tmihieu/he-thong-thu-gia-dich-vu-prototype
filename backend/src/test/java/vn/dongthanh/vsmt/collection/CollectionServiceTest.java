package vn.dongthanh.vsmt.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
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
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeAmount;
import vn.dongthanh.vsmt.billing.domain.ChargeRepository;
import vn.dongthanh.vsmt.billing.domain.ChargeRequest;
import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.collection.domain.CollectionVisit;
import vn.dongthanh.vsmt.collection.domain.CollectionVisitRepository;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.domain.PaymentRepository;
import vn.dongthanh.vsmt.collection.domain.VisitResult;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentOutcome;
import vn.dongthanh.vsmt.collection.service.CollectionService.VisitCommand;
import vn.dongthanh.vsmt.collection.service.CollectorAssignmentService;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Viết trước (TDD) cho T21: đủ tiền → PAID, chống gửi trùng, kỳ khóa, khoản miễn, thu vượt, lượt ghé, phạm vi. */
class CollectionServiceTest {

    final PaymentRepository payments = mock(PaymentRepository.class);
    final CollectionVisitRepository visits = mock(CollectionVisitRepository.class);
    final ChargeRepository charges = mock(ChargeRepository.class);
    final CollectorAssignmentService scope = mock(CollectorAssignmentService.class);
    final UserRepository users = mock(UserRepository.class);
    final AuditService audit = mock(AuditService.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-10-12T10:40:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final CollectionService service = new CollectionService(payments, visits, charges, scope, users, audit, clock);

    final Company dv01 = withId(Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1)), 1L);
    final CurrentUser collector = new CurrentUser(21L, "thu07", Role.COLLECTOR, 1L);
    final CurrentUser manager = new CurrentUser(5L, "dv01", Role.COMPANY_MANAGER, 1L);
    final List<Payment> saved = new ArrayList<>();
    CollectionPeriod october;
    Charge charge;

    @BeforeEach
    void setUp() {
        TariffVersion bg = TariffVersion.create("BG", "QĐ", LocalDate.of(2026, 9, 1), null, TariffStatus.ACTIVE);
        october = CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg);
        charge = newCharge(new ChargeAmount(TariffGroup.HH_3_PLUS, 80_000, 1, 80_000, false), 900L);
        when(charges.findByIdWithDetails(900L)).thenReturn(Optional.of(charge));
        when(payments.save(any(Payment.class))).thenAnswer(inv -> {
            saved.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
        when(payments.sumByChargeId(900L)).thenAnswer(inv -> saved.stream().mapToLong(Payment::getAmount).sum());
        when(payments.maxCodeNumber("TT-1026-")).thenReturn(122);
        when(visits.save(any(CollectionVisit.class))).thenAnswer(inv -> inv.getArgument(0));
        User thu07 = withId(User.create("thu07", "Người thu", Role.COLLECTOR, 1L, "x"), 21L);
        when(users.findById(21L)).thenReturn(Optional.of(thu07));
    }

    @Test
    void fullAmountMarksChargePaidAndAuditsBeforeAfter() {
        PaymentOutcome r = service.recordPayment(cash(80_000, "req-1"), collector);

        assertThat(r.replayed()).isFalse();
        assertThat(r.payment().getCode()).isEqualTo("TT-1026-000123");
        assertThat(r.payment().getCollectorId()).isEqualTo(21L);
        assertThat(r.payment().getConfirmedBy()).isEqualTo(21L);
        assertThat(charge.getStatus()).isEqualTo(ChargeStatus.PAID);
        assertThat(charge.getPaidAt()).isNotNull();
        assertThat(r.paidAmount()).isEqualTo(80_000);
        assertThat(r.remainingAmount()).isZero();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> before = ArgumentCaptor.forClass(Map.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> after = ArgumentCaptor.forClass(Map.class);
        verify(audit).record(eq(collector), eq("RECORD_PAYMENT"), eq("Charge"), eq(charge.getCode()), before.capture(),
                after.capture());
        assertThat(before.getValue()).containsEntry("status", ChargeStatus.UNPAID).containsEntry("paidAmount", 0L);
        assertThat(after.getValue()).containsEntry("status", ChargeStatus.PAID).containsEntry("paidAmount", 80_000L);
    }

    @Test
    void partialPaymentKeepsChargeUnpaidUntilFullyPaid() {
        service.recordPayment(cash(30_000, "req-1"), collector);
        assertThat(charge.getStatus()).isEqualTo(ChargeStatus.UNPAID);

        PaymentOutcome second = service.recordPayment(cash(50_000, "req-2"), collector);
        assertThat(charge.getStatus()).isEqualTo(ChargeStatus.PAID);
        assertThat(second.paidAmount()).isEqualTo(80_000);
    }

    @Test
    void sameRequestIdReturnsTheFirstPaymentWithoutCreatingAnother() {
        PaymentOutcome first = service.recordPayment(cash(80_000, "req-1"), collector);
        when(payments.findByClientRequestId("req-1")).thenReturn(Optional.of(first.payment()));

        PaymentOutcome again = service.recordPayment(cash(80_000, "req-1"), collector);

        assertThat(again.replayed()).isTrue();
        assertThat(again.payment()).isSameAs(first.payment());
        assertThat(saved).hasSize(1);
    }

    @Test
    void sameRequestIdForAnotherChargeIsAConflict() {
        Payment other = service.recordPayment(cash(80_000, "req-1"), collector).payment();
        ReflectionTestUtils.setField(other, "charge", newCharge(new ChargeAmount(null, 1, 1, 1, false), 901L));
        when(payments.findByClientRequestId("req-1")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.recordPayment(cash(80_000, "req-1"), collector))
                .extracting("code").isEqualTo("REQUEST_ID_REUSED");
    }

    @Test
    void lockedPeriodIs422() {
        ReflectionTestUtils.setField(october, "status", PeriodStatus.LOCKED);
        assertThatThrownBy(() -> service.recordPayment(cash(80_000, "req-1"), collector))
                .extracting("code").isEqualTo("PERIOD_LOCKED");
        assertThatThrownBy(() -> service.recordVisit(visit(VisitResult.ABSENT, null, "v-1"), collector))
                .extracting("code").isEqualTo("PERIOD_LOCKED");
    }

    @Test
    void exemptChargeIs422() {
        Charge exempt = newCharge(new ChargeAmount(TariffGroup.HH_3_PLUS, 80_000, 1, 0, true), 902L);
        when(charges.findByIdWithDetails(902L)).thenReturn(Optional.of(exempt));

        assertThatThrownBy(() -> service.recordPayment(new PaymentCommand(902L, 80_000, PaymentMethod.CASH, "req-9",
                null, null, null), collector)).extracting("code").isEqualTo("CHARGE_EXEMPT");
    }

    @Test
    void amountMustBePositiveAndNotExceedRemaining() {
        assertThatThrownBy(() -> service.recordPayment(cash(0, "req-1"), collector))
                .extracting("code").isEqualTo("PAYMENT_AMOUNT_INVALID");
        service.recordPayment(cash(60_000, "req-2"), collector);
        assertThatThrownBy(() -> service.recordPayment(cash(20_001, "req-3"), collector))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("20.000")
                .extracting("code").isEqualTo("PAYMENT_AMOUNT_INVALID");
    }

    @Test
    void alreadyPaidChargeIs422() {
        service.recordPayment(cash(80_000, "req-1"), collector);
        assertThatThrownBy(() -> service.recordPayment(cash(1, "req-2"), collector))
                .extracting("code").isEqualTo("CHARGE_ALREADY_PAID");
    }

    @Test
    void visitsDoNotChangeChargeStatusAndAppointmentNeedsADate() {
        service.recordVisit(visit(VisitResult.ABSENT, null, "v-1"), collector);
        service.recordVisit(visit(VisitResult.REFUSED, null, "v-2"), collector);
        service.recordVisit(visit(VisitResult.APPOINTMENT, LocalDate.of(2026, 10, 15), "v-3"), collector);

        assertThat(charge.getStatus()).isEqualTo(ChargeStatus.UNPAID);
        assertThatThrownBy(() -> service.recordVisit(visit(VisitResult.APPOINTMENT, null, "v-4"), collector))
                .extracting("code").isEqualTo("VISIT_REVISIT_DATE_REQUIRED");
        verify(audit, never()).record(any(), anyString(), anyString(), any(), any(), any());
    }

    @Test
    void sameVisitRequestIdIsRecordedOnce() {
        CollectionVisit first = service.recordVisit(visit(VisitResult.ABSENT, null, "v-1"), collector).visit();
        when(visits.findByClientRequestId("v-1")).thenReturn(Optional.of(first));

        assertThat(service.recordVisit(visit(VisitResult.ABSENT, null, "v-1"), collector).replayed()).isTrue();
        verify(visits).save(any());
    }

    @Test
    void collectorOutsideAssignedAreaIsRejectedAndCommuneCannotRecord() {
        doThrow(new NotFoundException("CHARGE_NOT_FOUND", "x")).when(scope).requireInScope(charge, collector);
        assertThatThrownBy(() -> service.recordPayment(cash(80_000, "req-1"), collector))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.recordPayment(cash(80_000, "req-1"),
                new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null))).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void managerRecordsOnBehalfOfOwnCollectorOnly() {
        assertThatThrownBy(() -> service.recordPayment(cash(80_000, "req-1"), manager))
                .extracting("code").isEqualTo("PAYMENT_COLLECTOR_REQUIRED");

        PaymentOutcome r = service.recordPayment(new PaymentCommand(900L, 80_000, PaymentMethod.CASH, "req-2", null,
                null, 21L), manager);
        assertThat(r.payment().getCollectorId()).isEqualTo(21L);
        assertThat(r.payment().getConfirmedBy()).isEqualTo(5L);

        Charge otherCompany = newCharge(new ChargeAmount(null, 1, 1, 1, false), 903L);
        ReflectionTestUtils.setField(otherCompany, "company",
                withId(Company.create("DV07", "Bảy", "B", "0900000007", LocalDate.of(2026, 1, 1)), 7L));
        when(charges.findByIdWithDetails(903L)).thenReturn(Optional.of(otherCompany));
        assertThatThrownBy(() -> service.recordPayment(new PaymentCommand(903L, 1, PaymentMethod.CASH, "req-3", null,
                null, 21L), manager)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void appSimulatedMethodIsNotAllowedForStaff() {
        assertThatThrownBy(() -> service.recordPayment(new PaymentCommand(900L, 80_000, PaymentMethod.APP_SIMULATED,
                "req-1", null, null, null), collector)).extracting("code").isEqualTo("PAYMENT_METHOD_INVALID");
    }

    private PaymentCommand cash(long amount, String requestId) {
        return new PaymentCommand(900L, amount, PaymentMethod.CASH, requestId, null, null, null);
    }

    private VisitCommand visit(VisitResult result, LocalDate revisit, String requestId) {
        return new VisitCommand(900L, result, revisit, null, requestId);
    }

    private Charge newCharge(ChargeAmount amount, Long id) {
        District dth = District.create("DTH", "Đông Thạnh");
        Area kv07 = withId(Area.create("KV07", "Tổ 07", dth), 7L);
        ServiceSubject s = withId(ServiceSubject.create("DTH-H000128", SubjectType.HOUSEHOLD, "Hộ", "Số 1", kv07), 128L);
        ServiceContract c = ServiceContract.create("ĐK-1", s, TariffGroup.HH_3_PLUS, LocalDate.of(2026, 1, 1), null,
                amount.exempt(), amount.exempt() ? "Hộ nghèo" : null, null);
        ChargeRequest req = ChargeRequest.issue("YCT-1026-01", october,
                FeeType.create("ENV", "Phí", PricingMode.TARIFF, null), ChargeScope.ALL, java.util.Set.of(), null,
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 25), null, null, 2L);
        return withId(Charge.issue("KT-1026-DTH-H000128", req, s, c, dv01, amount), id);
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
