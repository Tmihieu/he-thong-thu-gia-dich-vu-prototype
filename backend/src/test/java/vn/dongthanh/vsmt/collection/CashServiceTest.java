package vn.dongthanh.vsmt.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
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

import vn.dongthanh.vsmt.collection.domain.CashHandover;
import vn.dongthanh.vsmt.collection.domain.CashHandoverRepository;
import vn.dongthanh.vsmt.collection.domain.PaymentRepository;
import vn.dongthanh.vsmt.collection.service.CashService;
import vn.dongthanh.vsmt.collection.service.CashService.CashHeld;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Viết trước (TDD) cho T25: tiền mặt đang giữ (R21) và bàn giao (R22). */
class CashServiceTest {

    final PaymentRepository payments = mock(PaymentRepository.class);
    final CashHandoverRepository handovers = mock(CashHandoverRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final CompanyRepository companies = mock(CompanyRepository.class);
    final AuditService audit = mock(AuditService.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-10-12T10:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final CashService service = new CashService(payments, handovers, users, companies, audit, clock);

    final CurrentUser manager = new CurrentUser(5L, "dv01", Role.COMPANY_MANAGER, 1L);
    final CurrentUser collector = new CurrentUser(21L, "thu07", Role.COLLECTOR, 1L);
    final User thu07 = withId(User.create("thu07", "Người thu 07", Role.COLLECTOR, 1L, "x"), 21L);
    final User thu12 = withId(User.create("thu12", "Người thu 12", Role.COLLECTOR, 7L, "x"), 31L);
    final List<CashHandover> stored = new ArrayList<>();

    @BeforeEach
    void setUp() {
        when(users.findById(21L)).thenReturn(Optional.of(thu07));
        when(users.findById(31L)).thenReturn(Optional.of(thu12));
        Company dv01 = withId(Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1)), 1L);
        when(companies.findById(1L)).thenReturn(Optional.of(dv01));
        // Hai lần thu tiền mặt: 80.000 + 40.000.
        when(payments.sumCashByCollector(21L)).thenReturn(120_000L);
        when(handovers.sumByCollector(21L)).thenAnswer(inv -> stored.stream().mapToLong(CashHandover::getAmount).sum());
        when(handovers.maxCodeNumber("BG-1026-")).thenAnswer(inv -> stored.size());
        when(handovers.save(any(CashHandover.class))).thenAnswer(inv -> {
            stored.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
    }

    @Test
    void heldIsCashCollectedMinusHandedOver() {
        assertThat(service.held(21L, manager)).isEqualTo(new CashHeld(thu07, 120_000, 0, 120_000));

        CashHandover h = service.handover(21L, 100_000, null, "Cuối ca", manager);

        assertThat(h.getCode()).isEqualTo("BG-1026-01");
        assertThat(h.getHandoverDate()).isEqualTo(LocalDate.of(2026, 10, 12));
        assertThat(h.getReceivedBy()).isEqualTo(5L);
        assertThat(service.held(21L, collector)).isEqualTo(new CashHeld(thu07, 120_000, 100_000, 20_000));
        verify(audit).record(eq(manager), eq("RECEIVE_CASH_HANDOVER"), eq("CashHandover"), eq("BG-1026-01"), any(), any());
    }

    @Test
    void handoverAboveHeldOrNotPositiveIs422() {
        assertThatThrownBy(() -> service.handover(21L, 120_001, null, null, manager))
                .hasMessageContaining("120.000")
                .extracting("code").isEqualTo("HANDOVER_AMOUNT_INVALID");
        assertThatThrownBy(() -> service.handover(21L, 0, null, null, manager))
                .extracting("code").isEqualTo("HANDOVER_AMOUNT_INVALID");
        assertThatThrownBy(() -> service.handover(21L, -5, null, null, manager))
                .extracting("code").isEqualTo("HANDOVER_AMOUNT_INVALID");
    }

    @Test
    void secondHandoverOfTheMonthGetsNextNumber() {
        service.handover(21L, 50_000, null, null, manager);
        assertThat(service.handover(21L, 50_000, null, null, manager).getCode()).isEqualTo("BG-1026-02");
        assertThatThrownBy(() -> service.handover(21L, 20_001, null, null, manager))
                .extracting("code").isEqualTo("HANDOVER_AMOUNT_INVALID");
    }

    @Test
    void onlyManagerOfTheSameCompanyRecordsHandoversAndCollectorSeesOnlyOwnCash() {
        assertThatThrownBy(() -> service.handover(21L, 10_000, null, null, collector))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.handover(31L, 10_000, null, null, manager))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.held(31L, manager)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.held(31L, collector)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void futureHandoverDateIsRejected() {
        assertThatThrownBy(() -> service.handover(21L, 10_000, LocalDate.of(2026, 10, 13), null, manager))
                .extracting("code").isEqualTo("HANDOVER_DATE_INVALID");
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
