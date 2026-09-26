package vn.dongthanh.vsmt.masterdata.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignment;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignmentRepository;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Phân công khu vực cho công ty (cán bộ xã). Phân công mới tự đóng phân công đang hiệu lực vào ngày trước đó,
 * giữ lịch sử; {@link #companyOf} cho biết công ty phụ trách tại một ngày (dùng cho billing, remittance).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AreaAssignmentService {

    static final String ENTITY = "AreaAssignment";
    static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final AreaAssignmentRepository assignments;
    private final AreaRepository areas;
    private final CompanyRepository companies;
    private final AuditService audit;
    private final ApplicationEventPublisher events;

    public record AssignCommand(List<Long> areaIds, Long companyId, LocalDate fromDate, String note,
            String decisionNo) {
    }

    public List<AreaAssignment> assign(AssignCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        Company company = companies.findById(cmd.companyId())
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
        List<Long> ids = new ArrayList<>(new LinkedHashSet<>(cmd.areaIds()));
        Map<Long, Area> found = areas.findAllById(ids).stream().collect(Collectors.toMap(Area::getId, Function.identity()));
        if (found.size() != ids.size()) {
            throw new NotFoundException("AREA_NOT_FOUND", "Không tìm thấy một số khu vực đã chọn.");
        }

        List<AreaAssignment> created = new ArrayList<>();
        for (Long id : ids) {
            created.add(assignOne(found.get(id), company, cmd, actor));
        }
        return created;
    }

    private AreaAssignment assignOne(Area area, Company company, AssignCommand cmd, CurrentUser actor) {
        LocalDate from = cmd.fromDate();
        AreaAssignment latest = assignments.findHistory(area.getId()).stream().findFirst().orElse(null);
        Map<String, Object> before = null;
        if (latest != null) {
            if (from.isBefore(latest.getValidFrom())) {
                throw new BusinessRuleException("ASSIGNMENT_BEFORE_CURRENT", "Khu vực " + area.getCode()
                        + " đã có phân công từ " + VN_DATE.format(latest.getValidFrom())
                        + "; ngày bắt đầu mới phải sau ngày đó.");
            }
            if (from.isEqual(latest.getValidFrom())) {
                throw new BusinessRuleException("ASSIGNMENT_OVERLAP", "Khu vực " + area.getCode()
                        + " đã có phân công bắt đầu đúng ngày " + VN_DATE.format(from) + ".");
            }
            if (latest.covers(from)) {
                if (latest.getCompany().getId().equals(company.getId())) {
                    throw new BusinessRuleException("ASSIGNMENT_SAME_COMPANY", "Khu vực " + area.getCode()
                            + " đang do " + company.getCode() + " phụ trách.");
                }
                before = snapshot(latest);
                latest.closeOn(from.minusDays(1));
                // Hibernate chạy INSERT trước UPDATE khi flush; đóng bản cũ trước để không vướng exclusion constraint.
                assignments.saveAndFlush(latest);
                events.publishEvent(new AreaReassignedEvent(area.getId(), latest.getCompany().getId(),
                        company.getId(), from));
            }
        }
        AreaAssignment saved = assignments.save(AreaAssignment.create(area, company, from, cmd.note(), cmd.decisionNo()));
        audit.record(actor, "ASSIGN_AREA", ENTITY, area.getCode(), before, snapshot(saved));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<AreaAssignment> history(Long areaId) {
        return assignments.findHistory(areaId);
    }

    /** Công ty phụ trách khu vực vào ngày {@code date}; rỗng nếu chưa phân công. */
    @Transactional(readOnly = true)
    public Optional<Long> companyOf(Long areaId, LocalDate date) {
        return assignments.findHistory(areaId).stream()
                .filter(a -> a.covers(date))
                .map(a -> a.getCompany().getId())
                .findFirst();
    }

    /** Phân công đang hiệu lực vào ngày {@code date}; công ty chỉ thấy khu vực của mình. */
    @Transactional(readOnly = true)
    public List<AreaAssignment> activeOn(LocalDate date, CurrentUser actor) {
        return assignments.findActiveOn(date, actor.role().belongsToCompany() ? actor.companyId() : null);
    }

    private static Map<String, Object> snapshot(AreaAssignment a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("area", a.getArea().getCode());
        m.put("company", a.getCompany().getCode());
        m.put("validFrom", a.getValidFrom());
        m.put("validTo", a.getValidTo());
        return m;
    }
}
