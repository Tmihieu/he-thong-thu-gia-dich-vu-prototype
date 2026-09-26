package vn.dongthanh.vsmt.billing.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeAmount;
import vn.dongthanh.vsmt.billing.domain.ChargeRepository;
import vn.dongthanh.vsmt.billing.domain.ChargeRequest;
import vn.dongthanh.vsmt.billing.domain.ChargeRequestRepository;
import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.Coverage;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.Decision;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.Eligible;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.SkipReason;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.Skipped;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignment;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignmentRepository;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContractRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Phiếu yêu cầu thu: xem trước (không ghi CSDL) và phát hành (sinh khoản trong một transaction). Cả hai dùng chung
 * một kế hoạch nên luôn cho cùng số khoản và tổng tiền. Phát hành lại không sinh trùng (R2 + exclusion constraint);
 * nếu không có khoản mới thì không lưu phiếu. Công ty của khoản chụp theo phân công tại ngày phát hành (G3).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ChargeRequestService {

    static final String ENTITY = "ChargeRequest";

    private final ChargeRequestRepository requests;
    private final ChargeRepository charges;
    private final CollectionPeriodRepository periods;
    private final FeeTypeRepository feeTypes;
    private final AreaRepository areas;
    private final CompanyRepository companies;
    private final AreaAssignmentRepository assignments;
    private final ServiceSubjectRepository subjects;
    private final ServiceContractRepository contracts;
    private final ChargeCalculator calculator;
    private final ChargeEligibility eligibility;
    private final AuditService audit;
    private final Clock clock;

    public record IssueCommand(Long periodId, Long feeTypeId, ChargeScope scopeType, List<Long> areaIds,
            Long companyId, LocalDate dueDate, Long unitPrice, String note) {
    }

    public record SkippedLine(Long subjectId, String subjectCode, String subjectName, String areaCode,
            SkipReason reason, String message) {
    }

    public record IssueResult(String requestCode, int chargeCount, int exemptCount, long totalAmount,
            int warningCount, List<SkippedLine> skipped) {
    }

    private record Planned(ServiceSubject subject, ServiceContract contract, Company company, ChargeAmount amount) {
    }

    private record Plan(CollectionPeriod period, FeeType feeType, Set<Area> scopeAreas, Company scopeCompany,
            LocalDate issueDate, Long unitPrice, List<Planned> charges, List<SkippedLine> skipped) {

        IssueResult result(String requestCode) {
            long total = charges.stream().mapToLong(p -> p.amount().amount()).reduce(0L, Math::addExact);
            int exempt = (int) charges.stream().filter(p -> p.amount().exempt()).count();
            int warnings = (int) skipped.stream().filter(s -> s.reason().warning()).count();
            return new IssueResult(requestCode, charges.size(), exempt, total, warnings, skipped);
        }
    }

    @Transactional(readOnly = true)
    public IssueResult preview(IssueCommand cmd, CurrentUser actor) {
        return plan(cmd, actor).result(null);
    }

    public IssueResult publish(IssueCommand cmd, CurrentUser actor) {
        Plan plan = plan(cmd, actor);
        if (plan.charges().isEmpty()) {
            return plan.result(null);
        }
        CollectionPeriod period = plan.period();
        String token = periodToken(period);
        String code = "YCT-%s-%02d".formatted(token, requests.countByPeriodId(period.getId()) + 1);
        ChargeRequest request = requests.save(ChargeRequest.issue(code, period, plan.feeType(), cmd.scopeType(),
                plan.scopeAreas(), plan.scopeCompany(), plan.issueDate(), cmd.dueDate(), plan.unitPrice(),
                cmd.note(), actor.id()));
        String suffix = "ENV".equals(plan.feeType().getCode()) ? "" : "-" + plan.feeType().getCode().substring(0, 2);
        List<Charge> created = plan.charges().stream()
                .map(p -> Charge.issue("KT-" + token + "-" + p.subject().getCode() + suffix, request, p.subject(),
                        p.contract(), p.company(), p.amount()))
                .toList();
        charges.saveAll(created);
        IssueResult result = plan.result(code);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("period", period.getCode());
        after.put("feeType", plan.feeType().getCode());
        after.put("scope", cmd.scopeType());
        after.put("dueDate", cmd.dueDate());
        after.put("chargeCount", result.chargeCount());
        after.put("exemptCount", result.exemptCount());
        after.put("totalAmount", result.totalAmount());
        audit.record(actor, "ISSUE_CHARGE_REQUEST", ENTITY, code, null, after);
        return result;
    }

    private Plan plan(IssueCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        CollectionPeriod period = periods.findByIdWithTariff(cmd.periodId())
                .orElseThrow(() -> new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu."));
        ChargeEligibility.requireBillable(period);
        FeeType feeType = feeTypes.findById(cmd.feeTypeId())
                .filter(FeeType::isActive)
                .orElseThrow(() -> new NotFoundException("FEE_TYPE_NOT_FOUND", "Không tìm thấy loại phí đang dùng."));
        if (cmd.dueDate().isAfter(period.getDueDate())) {
            throw new BusinessRuleException("CHARGE_DUE_AFTER_PERIOD",
                    "Hạn hộ đóng không được sau hạn công ty nộp xã của kỳ " + period.getCode() + ".");
        }
        LocalDate issueDate = LocalDate.now(clock);
        Long unitPrice = feeType.getPricingMode() == PricingMode.FIXED ? cmd.unitPrice() : null;

        Set<Area> scopeAreas = new LinkedHashSet<>();
        Company scopeCompany = null;
        List<AreaAssignment> active = assignments.findActiveOn(issueDate, null);
        List<ServiceSubject> inScope = switch (cmd.scopeType()) {
            case ALL -> subjects.findAllWithArea();
            case AREAS -> {
                if (cmd.areaIds() == null || cmd.areaIds().isEmpty()) {
                    throw new BusinessRuleException("CHARGE_SCOPE_INVALID", "Phải chọn ít nhất một tổ.");
                }
                scopeAreas.addAll(areas.findAllById(cmd.areaIds()));
                if (scopeAreas.size() != new LinkedHashSet<>(cmd.areaIds()).size()) {
                    throw new NotFoundException("AREA_NOT_FOUND", "Không tìm thấy một số tổ đã chọn.");
                }
                yield subjects.findAllWithAreaIn(cmd.areaIds());
            }
            case COMPANY -> {
                if (cmd.companyId() == null) {
                    throw new BusinessRuleException("CHARGE_SCOPE_INVALID", "Phải chọn công ty.");
                }
                scopeCompany = companies.findById(cmd.companyId())
                        .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
                Long companyId = scopeCompany.getId();
                List<Long> areaIds = active.stream().filter(a -> a.getCompany().getId().equals(companyId))
                        .map(a -> a.getArea().getId()).toList();
                yield areaIds.isEmpty() ? List.of() : subjects.findAllWithAreaIn(areaIds);
            }
        };

        Map<Long, Company> companyByArea = new HashMap<>();
        active.forEach(a -> companyByArea.put(a.getArea().getId(), a.getCompany()));
        List<Long> subjectIds = inScope.stream().map(ServiceSubject::getId).toList();
        Map<Long, List<ServiceContract>> contractsBySubject = group(subjectIds.isEmpty() ? List.of()
                : contracts.findBySubjectIdIn(subjectIds));
        Map<Long, List<Coverage>> coverages = new HashMap<>();
        if (!subjectIds.isEmpty()) {
            for (Object[] row : charges.findCoverages(feeType.getId(), subjectIds, period.getStartDate(),
                    period.getEndDate())) {
                coverages.computeIfAbsent((Long) row[0], k -> new ArrayList<>())
                        .add(new Coverage((LocalDate) row[1], (LocalDate) row[2]));
            }
        }

        List<Planned> planned = new ArrayList<>();
        List<SkippedLine> skipped = new ArrayList<>();
        for (ServiceSubject s : inScope) {
            Company company = companyByArea.get(s.getArea().getId());
            Decision d = eligibility.decide(s, contractsBySubject.getOrDefault(s.getId(), List.of()),
                    company == null ? null : company.getId(), coverages.getOrDefault(s.getId(), List.of()), period,
                    issueDate);
            if (d instanceof Eligible e) {
                planned.add(new Planned(s, e.contract(), company,
                        calculator.calculate(feeType, period, e.contract(), unitPrice)));
            } else if (d instanceof Skipped k) {
                skipped.add(new SkippedLine(s.getId(), s.getCode(), s.getName(), s.getArea().getCode(), k.reason(),
                        k.message()));
            }
        }
        return new Plan(period, feeType, scopeAreas, scopeCompany, issueDate, unitPrice, planned, skipped);
    }

    @Transactional(readOnly = true)
    public Page<Charge> searchCharges(Long periodId, Long areaId, ChargeStatus status, Long subjectId, Pageable page,
            CurrentUser actor) {
        Long companyId = actor.role().belongsToCompany() ? actor.companyId() : null;
        return charges.search(periodId, areaId, status, subjectId, companyId, page);
    }

    public record RequestSummary(ChargeRequest request, long chargeCount, long exemptCount, long totalAmount) {
    }

    @Transactional(readOnly = true)
    public List<RequestSummary> listRequests(Long periodId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN);
        List<ChargeRequest> list = requests.findForList(periodId);
        Map<Long, Object[]> totals = new HashMap<>();
        if (!list.isEmpty()) {
            requests.totalsByRequest(list.stream().map(ChargeRequest::getId).toList())
                    .forEach(row -> totals.put((Long) row[0], row));
        }
        return list.stream().map(r -> {
            Object[] t = totals.get(r.getId());
            return t == null ? new RequestSummary(r, 0, 0, 0)
                    : new RequestSummary(r, (Long) t[1], ((Number) t[2]).longValue(), ((Number) t[3]).longValue());
        }).toList();
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    /** Phần kỳ trong mã chứng từ: tháng {@code MMYY} (1026), quý {@code Q{quý}{YY}} (Q426) (G11). */
    static String periodToken(CollectionPeriod p) {
        int yy = p.getStartDate().getYear() % 100;
        if (p.getPeriodType() == PeriodType.QUARTER) {
            return "Q%d%02d".formatted((p.getStartDate().getMonthValue() - 1) / 3 + 1, yy);
        }
        return "%02d%02d".formatted(p.getStartDate().getMonthValue(), yy);
    }

    private static Map<Long, List<ServiceContract>> group(Collection<ServiceContract> all) {
        Map<Long, List<ServiceContract>> m = new HashMap<>();
        all.forEach(c -> m.computeIfAbsent(c.getSubject().getId(), k -> new ArrayList<>()).add(c));
        return m;
    }
}
