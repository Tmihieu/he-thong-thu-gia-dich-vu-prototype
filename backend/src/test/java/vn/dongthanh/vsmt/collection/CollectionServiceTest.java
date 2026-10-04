package vn.dongthanh.vsmt.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
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
import org.mockito.InOrder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeAmount;
import vn.dongthanh.vsmt.billing.domain.ChargeRepository;
import vn.dongthanh.vsmt.billing.domain.ChargeRequest;
import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.domain.PaymentRepository;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentOutcome;
import vn.dongthanh.vsmt.collection.service.CollectorAssignmentService;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
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
import vn.dongthanh.vsmt.masterdata.service.PeriodGuard;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Viết trước (TDD) cho T21: đủ tiền → PAID, không thu một phần, chống gửi trùng, kỳ khóa, khoản miễn, phạm vi. */
class CollectionServiceTest {

    final PaymentRepository payments = mock(PaymentRepository.class);
    final ChargeRepository charges = mock(ChargeRepository.class);
    final CollectorAssignmentService scope = mock(CollectorAssignmentService.class);
    final UserRepository users = mock(UserRepository.class);
    final CollectionPeriodRepository periods = mock(CollectionPeriodRepository.class);
    final CitizenAccountRepository citizenAccounts = mock(CitizenAccountRepository.class);
    final NotificationService notifications = mock(NotificationService.class);
    final AuditService audit = mock(AuditService.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-10-12T10:40:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final CollectionService service = new CollectionService(payments, charges, scope, users,
            new PeriodGuard(periods), citizenAccounts, notifications, audit, clock);

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
        // Trạng thái kỳ đọc lại từ CSDL (FOR SHARE) giả lập bằng trạng thái của entity.
        when(periods.lockStatusForShare(any())).thenAnswer(inv -> october.getStatus().name());
        charge = newCharge(new ChargeAmount(TariffGroup.HH_3_PLUS, 80_000, 1, 80_000, false), 900L);
        when(charges.findByIdWithDetails(900L)).thenReturn(Optional.of(charge));
        when(payments.save(any(Payment.class))).thenAnswer(inv -> {
            saved.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
        when(payments.sumByChargeId(900L)).thenAnswer(inv -> saved.stream().mapToLong(Payment::getAmount).sum());
        when(payments.maxCodeNumber("TT-1026-")).thenReturn(122);
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
        assertThat(before.getValue()).containsEntry("status", ChargeStatus.UNPAID).containsEntry("paidAmount", 0L)
                .containsEntry("chargeAmount", 80_000L);
        assertThat(after.getValue()).containsEntry("status", ChargeStatus.PAID).containsEntry("paidAmount", 80_000L)
                .containsEntry("chargeAmount", 80_000L).containsEntry("paymentAmount", 80_000L);
    }

    @Test
    void bankTransferAuditsChargeAmountApartFromThisPaymentAmount() {
        service.recordBankTransfer(900L, 80_000, "FT26100001", "sepay-1");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> transferBefore = ArgumentCaptor.forClass(Map.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> transferAfter = ArgumentCaptor.forClass(Map.class);
        verify(audit).recordSystem(eq("RECORD_BANK_TRANSFER"), eq("Charge"), eq(charge.getCode()),
                transferBefore.capture(), transferAfter.capture());
        assertThat(transferBefore.getValue()).containsEntry("chargeAmount", 80_000L).containsEntry("paidAmount", 0L);
        assertThat(transferAfter.getValue()).containsEntry("chargeAmount", 80_000L)
                .containsEntry("paymentAmount", 80_000L).containsEntry("paidAmount", 80_000L).doesNotContainKey("amount");
        assertThat(charge.getStatus()).isEqualTo(ChargeStatus.PAID);
        assertThat(saved).singleElement().satisfies(p -> {
            assertThat(p.getMethod()).isEqualTo(PaymentMethod.TRANSFER);
            assertThat(p.getCollectorId()).isNull();
        });
    }

    @Test
    void chargeRowIsLockedBeforeItIsLoadedAndBeforeTheRequestIdIsChecked() {
        service.recordPayment(cash(80_000, "req-1"), collector);
        assertThatThrownBy(() -> service.recordBankTransfer(900L, 80_000, "FT26100001", "sepay-1"))
                .extracting("code").isEqualTo("CHARGE_ALREADY_PAID");

        InOrder order = inOrder(charges, payments);
        order.verify(charges).lockById(900L);
        order.verify(charges).findByIdWithDetails(900L);
        order.verify(payments).findByClientRequestId("req-1");
        order.verify(charges).lockById(900L);
        order.verify(payments).findByClientRequestId("sepay-1");
        order.verify(charges).findByIdWithDetails(900L);
    }

    @Test
    void partialPaymentIsRejectedSoChargeIsEitherPaidOrUnpaid() {
        assertThatThrownBy(() -> service.recordPayment(cash(30_000, "req-1"), collector))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("80.000")
                .extracting("code").isEqualTo("PAYMENT_AMOUNT_INVALID");

        assertThat(charge.getStatus()).isEqualTo(ChargeStatus.UNPAID);
        assertThat(saved).isEmpty();
    }

    @Test
    void householdIsNotifiedWhenAPaymentIsRecorded() {
        when(citizenAccounts.findActiveIdsBySubject(any())).thenReturn(List.of(7L));

        service.recordPayment(cash(80_000, "req-1"), collector);

        verify(notifications).publish(any(), any());
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
    }

    @Test
    void exemptChargeIs422() {
        Charge exempt = newCharge(new ChargeAmount(TariffGroup.HH_3_PLUS, 80_000, 1, 0, true), 902L);
        when(charges.findByIdWithDetails(902L)).thenReturn(Optional.of(exempt));

        assertThatThrownBy(() -> service.recordPayment(new PaymentCommand(902L, 80_000, PaymentMethod.CASH, "req-9",
                null, null, null), collector)).extracting("code").isEqualTo("CHARGE_EXEMPT");
    }

    @Test
    void amountMustEqualTheAmountDue() {
        for (long amount : new long[] {0, 79_999, 80_001}) {
            assertThatThrownBy(() -> service.recordPayment(cash(amount, "req-" + amount), collector))
                    .extracting("code").isEqualTo("PAYMENT_AMOUNT_INVALID");
        }
        assertThat(saved).isEmpty();
    }

    @Test
    void alreadyPaidChargeIs422() {
        service.recordPayment(cash(80_000, "req-1"), collector);
        assertThatThrownBy(() -> service.recordPayment(cash(1, "req-2"), collector))
                .extracting("code").isEqualTo("CHARGE_ALREADY_PAID");
    }

    @Test
    void replayIsReturnedOnlyInsideTheCallersScope() {
        Payment first = service.recordPayment(cash(80_000, "req-1"), collector).payment();
        when(payments.findByClientRequestId("req-1")).thenReturn(Optional.of(first));

        CurrentUser otherCollector = new CurrentUser(22L, "thu09", Role.COLLECTOR, 1L);
        doThrow(new NotFoundException("CHARGE_NOT_FOUND", "x")).when(scope).requireInScope(charge, otherCollector);
        assertThatThrownBy(() -> service.recordPayment(cash(80_000, "req-1"), otherCollector))
                .isInstanceOf(NotFoundException.class);

        CurrentUser otherCompany = new CurrentUser(6L, "dv07", Role.COMPANY_MANAGER, 7L);
        assertThatThrownBy(() -> service.recordPayment(cash(80_000, "req-1"), otherCompany))
                .isInstanceOf(NotFoundException.class);

        assertThat(service.recordPayment(cash(80_000, "req-1"), collector).replayed()).isTrue();
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
    void staffRecordCashOnlyBecauseTransfersArriveFromTheBank() {
        for (PaymentMethod method : List.of(PaymentMethod.TRANSFER, PaymentMethod.APP_SIMULATED, PaymentMethod.REFUND)) {
            assertThatThrownBy(() -> service.recordPayment(new PaymentCommand(900L, 80_000, method,
                    "req-" + method, null, null, null), collector)).extracting("code").isEqualTo("PAYMENT_METHOD_INVALID");
        }
        assertThat(saved).isEmpty();
        assertThat(charge.getStatus()).isEqualTo(ChargeStatus.UNPAID);
    }

    private PaymentCommand cash(long amount, String requestId) {
        return new PaymentCommand(900L, amount, PaymentMethod.CASH, requestId, null, null, null);
    }

    private Charge newCharge(ChargeAmount amount, Long id) {
        District dth = District.create("DTH", "Đông Thạnh");
        Area kv07 = withId(Area.create("KV07", "Tổ 07", dth), 7L);
        ServiceSubject s = withId(ServiceSubject.create("DTH-H000128", SubjectType.HOUSEHOLD, "Hộ", null, "Số 1", kv07), 128L);
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
