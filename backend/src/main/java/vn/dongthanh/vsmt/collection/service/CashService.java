package vn.dongthanh.vsmt.collection.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.collection.domain.CashHandover;
import vn.dongthanh.vsmt.collection.domain.CashHandoverRepository;
import vn.dongthanh.vsmt.collection.domain.PaymentRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Tiền mặt người đi thu đang giữ (R21) = Σ thanh toán tiền mặt người đó thu − Σ đã bàn giao, tính trên mọi kỳ (D5).
 * Bàn giao (R22): 0 &lt; số tiền ≤ đang giữ; quản lý công ty ghi khi nhận tiền, người đi thu chỉ xem (G5).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CashService {

    static final String ENTITY = "CashHandover";

    private final PaymentRepository payments;
    private final CashHandoverRepository handovers;
    private final UserRepository users;
    private final CompanyRepository companies;
    private final AuditService audit;
    private final Clock clock;

    public record CashHeld(User collector, long collectedCash, long handedOver, long held) {
    }

    @Transactional(readOnly = true)
    public CashHeld held(Long collectorId, CurrentUser actor) {
        User collector = collectorInScope(collectorId, actor);
        long collected = payments.sumCashByCollector(collector.getId());
        long handed = handovers.sumByCollector(collector.getId());
        return new CashHeld(collector, collected, handed, collected - handed);
    }

    /** Tiền mặt đang giữ của mọi người đi thu thuộc công ty (quản lý công ty). */
    @Transactional(readOnly = true)
    public List<CashHeld> heldForCompany(CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        return users.findByCompanyIdAndRoleOrderByUsername(actor.companyId(), Role.COLLECTOR).stream()
                .map(u -> held(u.getId(), actor)).toList();
    }

    public CashHandover handover(Long collectorId, long amount, LocalDate date, String note, CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        User collector = collectorInScope(collectorId, actor);
        LocalDate today = LocalDate.now(clock);
        LocalDate handoverDate = date != null ? date : today;
        if (handoverDate.isAfter(today)) {
            throw new BusinessRuleException("HANDOVER_DATE_INVALID", "Ngày bàn giao không được sau hôm nay.");
        }
        long held = payments.sumCashByCollector(collector.getId()) - handovers.sumByCollector(collector.getId());
        if (amount <= 0 || amount > held) {
            throw new BusinessRuleException("HANDOVER_AMOUNT_INVALID", "Số tiền bàn giao phải lớn hơn 0 và không vượt"
                    + " tiền mặt đang giữ (" + Money.format(held) + ").");
        }
        Company company = companies.findById(actor.companyId())
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
        String prefix = "BG-%02d%02d-".formatted(handoverDate.getMonthValue(), handoverDate.getYear() % 100);
        String code = prefix + "%02d".formatted(handovers.maxCodeNumber(prefix) + 1);
        CashHandover saved = handovers.save(CashHandover.receive(code, collector, company, handoverDate, amount,
                note == null || note.isBlank() ? null : note.trim(), actor.id()));
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("collector", collector.getUsername());
        after.put("amount", amount);
        after.put("date", handoverDate);
        after.put("heldBefore", held);
        after.put("heldAfter", held - amount);
        audit.record(actor, "RECEIVE_CASH_HANDOVER", ENTITY, code, null, after);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<CashHandover> list(Long collectorId, CurrentUser actor) {
        if (actor.role() == Role.COLLECTOR) {
            return handovers.findForCompany(actor.companyId(), actor.id());
        }
        actor.requireRole(Role.COMPANY_MANAGER);
        return handovers.findForCompany(actor.companyId(), collectorId);
    }

    private User collectorInScope(Long collectorId, CurrentUser actor) {
        User collector = users.findById(collectorId).filter(u -> u.getRole() == Role.COLLECTOR)
                .orElseThrow(() -> new NotFoundException("COLLECTOR_NOT_FOUND", "Không tìm thấy người đi thu."));
        boolean allowed = switch (actor.role()) {
            case COLLECTOR -> Objects.equals(actor.id(), collector.getId());
            case COMPANY_MANAGER -> Objects.equals(actor.companyId(), collector.getCompanyId());
            case COMMUNE_OFFICER, ADMIN -> true;
        };
        if (!allowed) {
            throw new AccessDeniedException("Người đi thu ngoài phạm vi");
        }
        return collector;
    }
}
