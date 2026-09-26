package vn.dongthanh.vsmt.collection.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
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
import vn.dongthanh.vsmt.collection.domain.CollectorAssignment;
import vn.dongthanh.vsmt.collection.domain.CollectorAssignmentRepository;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.masterdata.service.AreaReassignedEvent;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Phân tổ cho người đi thu (quản lý công ty). Công ty chỉ phân tổ đang được phân công cho mình, cho người đi thu
 * của mình; mỗi tổ tạm thời tối đa 1 người đang hiệu lực (kiểm ở đây, không ở CSDL). Người đi thu chỉ thấy khoản
 * của hộ trong tổ được giao. Khi tổ đổi công ty, phân tổ của công ty cũ tự kết thúc (G14).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CollectorAssignmentService {

    static final String ENTITY = "CollectorAssignment";

    private final CollectorAssignmentRepository assignments;
    private final UserRepository users;
    private final AreaRepository areas;
    private final CompanyRepository companies;
    private final AreaAssignmentService areaAssignments;
    private final ChargeRepository charges;
    private final AuditService audit;
    private final Clock clock;

    public List<CollectorAssignment> assign(Long collectorId, List<Long> areaIds, LocalDate fromDate, String note,
            CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        Company company = companies.findById(actor.companyId())
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
        User collector = users.findById(collectorId)
                .filter(u -> u.getRole() == Role.COLLECTOR)
                .orElseThrow(() -> new NotFoundException("COLLECTOR_NOT_FOUND", "Không tìm thấy người đi thu."));
        if (!Objects.equals(collector.getCompanyId(), company.getId())) {
            throw new AccessDeniedException("Người đi thu không thuộc công ty " + company.getCode());
        }
        List<CollectorAssignment> created = new ArrayList<>();
        for (Long areaId : new LinkedHashSet<>(areaIds)) {
            Area area = areas.findById(areaId)
                    .orElseThrow(() -> new NotFoundException("AREA_NOT_FOUND", "Không tìm thấy khu vực."));
            if (!Objects.equals(areaAssignments.companyOf(areaId, fromDate).orElse(null), company.getId())) {
                throw new AccessDeniedException("Khu vực " + area.getCode() + " không thuộc công ty " + company.getCode());
            }
            created.add(assignOne(collector, area, company, fromDate, note, actor));
        }
        return created;
    }

    private CollectorAssignment assignOne(User collector, Area area, Company company, LocalDate from, String note,
            CurrentUser actor) {
        Map<String, Object> before = null;
        for (CollectorAssignment open : assignments.findOpenForArea(area.getId(), from)) {
            if (!open.getValidFrom().isBefore(from)) {
                throw new BusinessRuleException("COLLECTOR_ASSIGNMENT_OVERLAP", "Tổ " + area.getCode()
                        + " đã có phân tổ bắt đầu từ ngày này trở đi; hãy chọn ngày sau đó.");
            }
            if (open.getCollector().getId().equals(collector.getId())) {
                throw new BusinessRuleException("COLLECTOR_ALREADY_ASSIGNED", "Tổ " + area.getCode()
                        + " đang do " + collector.getFullName() + " phụ trách.");
            }
            // Mỗi tổ tạm thời tối đa 1 người đang hiệu lực: người cũ kết thúc vào ngày trước.
            before = snapshot(open);
            open.closeOn(from.minusDays(1));
            assignments.saveAndFlush(open);
        }
        CollectorAssignment saved = assignments.save(CollectorAssignment.create(collector, area, company, from, note,
                actor.id()));
        audit.record(actor, "ASSIGN_COLLECTOR", ENTITY, area.getCode(), before, snapshot(saved));
        return saved;
    }

    public CollectorAssignment end(Long id, LocalDate endDate, CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        CollectorAssignment a = assignments.findById(id)
                .filter(x -> Objects.equals(x.getCompany().getId(), actor.companyId()))
                .orElseThrow(() -> new NotFoundException("COLLECTOR_ASSIGNMENT_NOT_FOUND", "Không tìm thấy phân tổ."));
        Map<String, Object> before = snapshot(a);
        a.closeOn(endDate);
        audit.record(actor, "END_COLLECTOR_ASSIGNMENT", ENTITY, a.getArea().getCode(), before, snapshot(a));
        return a;
    }

    /** G14: tổ chuyển sang công ty khác → phân tổ của công ty cũ kết thúc vào ngày trước khi chuyển. */
    @EventListener
    public void onAreaReassigned(AreaReassignedEvent e) {
        for (CollectorAssignment a : assignments.findOpenOfCompanyInArea(e.areaId(), e.oldCompanyId(), e.fromDate())) {
            Map<String, Object> before = snapshot(a);
            a.closeOn(e.fromDate().minusDays(1));
            audit.recordSystem("END_COLLECTOR_ASSIGNMENT", ENTITY, a.getArea().getCode(), before, snapshot(a));
        }
    }

    @Transactional(readOnly = true)
    public List<User> collectorsOf(CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        return users.findByCompanyIdAndRoleOrderByUsername(actor.companyId(), Role.COLLECTOR);
    }

    /** Phân tổ đang hiệu lực: công ty thấy của mình, người đi thu thấy của mình, xã và quản trị thấy tất cả. */
    @Transactional(readOnly = true)
    public List<CollectorAssignment> activeOn(LocalDate date, CurrentUser actor) {
        if (actor.role() == Role.COLLECTOR) {
            return assignments.findActiveOfCollector(actor.id(), date);
        }
        return assignments.findActiveOn(date, actor.role().belongsToCompany() ? actor.companyId() : null);
    }

    @Transactional(readOnly = true)
    public Page<Charge> myCharges(Long periodId, ChargeStatus status, Pageable page, CurrentUser actor) {
        actor.requireRole(Role.COLLECTOR);
        List<Long> areaIds = assignments.findAreaIdsOf(actor.id(), today());
        if (areaIds.isEmpty()) {
            return Page.empty(page);
        }
        return charges.searchInAreas(actor.companyId(), areaIds, periodId, status, page);
    }

    /** Khoản trong phạm vi người đi thu (tổ đang được giao, của công ty mình); ngoài phạm vi → 404. */
    @Transactional(readOnly = true)
    public Charge myCharge(Long chargeId, CurrentUser actor) {
        actor.requireRole(Role.COLLECTOR);
        Charge charge = charges.findByIdWithDetails(chargeId).orElseThrow(CollectorAssignmentService::chargeNotFound);
        requireInScope(charge, actor);
        return charge;
    }

    /** Chặn người đi thu thao tác khoản ngoài tổ được giao (dùng cho ghi nhận thu, T21). */
    @Transactional(readOnly = true)
    public void requireInScope(Charge charge, CurrentUser actor) {
        boolean inScope = Objects.equals(charge.getCompany().getId(), actor.companyId())
                && assignments.findAreaIdsOf(actor.id(), today()).contains(charge.getArea().getId());
        if (!inScope) {
            throw chargeNotFound();
        }
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    private static NotFoundException chargeNotFound() {
        return new NotFoundException("CHARGE_NOT_FOUND", "Không tìm thấy khoản thu trong tổ được giao.");
    }

    private static Map<String, Object> snapshot(CollectorAssignment a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("collector", a.getCollector().getUsername());
        m.put("area", a.getArea().getCode());
        m.put("company", a.getCompany().getCode());
        m.put("validFrom", a.getValidFrom());
        m.put("validTo", a.getValidTo());
        return m;
    }
}
