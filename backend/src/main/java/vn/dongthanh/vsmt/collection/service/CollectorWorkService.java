package vn.dongthanh.vsmt.collection.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeRepository;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.collection.domain.CashHandoverRepository;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.domain.PaymentRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.UserReassignedEvent;

/**
 * Phạm vi làm việc của người đi thu (UC-23, UC-30, UC-33): không còn phân tổ, người đi thu thu và xem mọi hộ/khoản
 * của công ty mình; hệ thống ghi ai đã thu ({@code payments.collector_id}). Công ty không bao giờ thấy dữ liệu
 * công ty khác.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CollectorWorkService {

    private final PaymentRepository payments;
    private final CashHandoverRepository handovers;
    private final UserRepository users;
    private final ChargeRepository charges;
    private final Clock clock;

    /**
     * Người đi thu còn giữ tiền mặt chưa bàn giao thì không đổi vai trò / công ty được: tiền đang gắn với công ty cũ
     * (BR-PLT-05).
     */
    @EventListener
    public void onUserReassigned(UserReassignedEvent e) {
        if (!e.wasCollector()) {
            return;
        }
        long held = payments.sumCashByCollector(e.userId()) - handovers.sumByCollector(e.userId());
        if (held > 0) {
            throw new BusinessRuleException("COLLECTOR_HOLDS_CASH", e.username() + " còn giữ " + Money.format(held)
                    + " tiền mặt; công ty nhận bàn giao trước khi đổi vai trò hoặc công ty.");
        }
    }

    @Transactional(readOnly = true)
    public List<User> collectorsOf(CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        return users.findByCompanyIdAndRoleOrderByUsername(actor.companyId(), Role.COLLECTOR);
    }

    /** Khoản của công ty (theo công ty chụp trên khoản, G3), lọc theo kỳ / tổ / trạng thái; người đi thu và quản lý công ty. */
    @Transactional(readOnly = true)
    public Page<Charge> companyCharges(Long periodId, Long areaId, ChargeStatus status, Pageable page, CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER, Role.COLLECTOR);
        return charges.search(periodId, areaId, status, null, actor.companyId(), "", page);
    }

    /** UC-33: khoản mà một người đi thu của công ty đã thu (theo payments.collector_id), lọc theo kỳ / trạng thái. */
    @Transactional(readOnly = true)
    public Page<Charge> chargesCollectedBy(Long collectorId, Long periodId, ChargeStatus status, Pageable page,
            CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        requireCollectorOfCompany(collectorId, actor);
        return charges.searchCollectedBy(actor.companyId(), collectorId, periodId, status, page);
    }

    /** UC-33: lịch sử thu của một người đi thu của công ty, mới trước. */
    @Transactional(readOnly = true)
    public List<Payment> paymentsOf(Long collectorId, CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        requireCollectorOfCompany(collectorId, actor);
        return payments.findByCollectorWithCharge(actor.companyId(), collectorId);
    }

    /** Khoản của công ty người đi thu; khoản công ty khác → 404. */
    @Transactional(readOnly = true)
    public Charge myCharge(Long chargeId, CurrentUser actor) {
        actor.requireRole(Role.COLLECTOR);
        Charge charge = charges.findByIdWithDetails(chargeId).orElseThrow(CollectorWorkService::chargeNotFound);
        requireInScope(charge, actor);
        return charge;
    }

    /** Chặn người đi thu thao tác khoản của công ty khác (dùng cho ghi nhận thu, UC-23). */
    @Transactional(readOnly = true)
    public void requireInScope(Charge charge, CurrentUser actor) {
        if (!Objects.equals(charge.getCompany().getId(), actor.companyId())) {
            throw chargeNotFound();
        }
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    private void requireCollectorOfCompany(Long collectorId, CurrentUser actor) {
        User collector = users.findById(collectorId).filter(u -> u.getRole() == Role.COLLECTOR)
                .orElseThrow(() -> new NotFoundException("COLLECTOR_NOT_FOUND", "Không tìm thấy người đi thu."));
        if (!Objects.equals(collector.getCompanyId(), actor.companyId())) {
            throw new AccessDeniedException("Người đi thu không thuộc công ty của bạn");
        }
    }

    private static NotFoundException chargeNotFound() {
        return new NotFoundException("CHARGE_NOT_FOUND", "Không tìm thấy khoản thu của công ty.");
    }
}
