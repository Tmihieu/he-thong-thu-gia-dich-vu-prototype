package vn.dongthanh.vsmt.masterdata.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContractRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Hồ sơ hộ: đối tượng + hợp đồng. Cán bộ xã tạo/sửa/ngừng; công ty và người đi thu chỉ đọc hộ thuộc
 * khu vực đang phân công cho công ty mình. Mỗi đối tượng tối đa 1 hợp đồng hiệu lực tại một thời điểm.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SubjectService {

    static final String SUBJECT = "ServiceSubject";
    static final String CONTRACT = "ServiceContract";

    private final ServiceSubjectRepository subjects;
    private final ServiceContractRepository contracts;
    private final AreaRepository areas;
    private final AreaAssignmentService assignments;
    private final AuditService audit;

    public record SubjectCommand(SubjectType type, String name, String address, Long areaId, String phone,
            Integer memberCount, String representativeName, String taxCode, String note) {
    }

    public record ContractCommand(TariffGroup tariffGroup, LocalDate validFrom, LocalDate validTo, boolean exempt,
            String exemptReason, String exemptDecisionNo, String note) {
    }

    public record SubjectFilter(Long districtId, Long areaId, SubjectStatus status, String q) {
    }

    public ServiceSubject create(SubjectCommand cmd, ContractCommand contract, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        Area area = area(cmd.areaId());
        String prefix = area.getDistrict().getCode() + "-" + cmd.type().codePrefix();
        int digits = 7 - cmd.type().codePrefix().length();
        String code = prefix + String.format("%0" + digits + "d", subjects.maxCodeNumber(prefix) + 1);

        ServiceSubject subject = ServiceSubject.create(code, cmd.type(), cmd.name().trim(), cmd.address().trim(), area);
        apply(subject, cmd, area);
        if (contract != null) {
            // Kiểm tra hợp đồng trước khi lưu đối tượng để lỗi không để lại đối tượng dở dang.
            ServiceContract.create("tmp", subject, contract.tariffGroup(), contract.validFrom(), contract.validTo(),
                    contract.exempt(), contract.exemptReason(), contract.exemptDecisionNo());
            subject.setStatus(SubjectStatus.ACTIVE);
        }
        ServiceSubject saved = subjects.save(subject);
        audit.record(actor, "CREATE_SUBJECT", SUBJECT, saved.getCode(), null, snapshot(saved));
        if (contract != null) {
            saveContract(saved, contract, actor);
        }
        return saved;
    }

    public ServiceSubject update(Long id, SubjectCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        ServiceSubject subject = find(id);
        Map<String, Object> before = snapshot(subject);
        subject.setSubjectType(cmd.type());
        subject.setName(cmd.name().trim());
        subject.setAddress(cmd.address().trim());
        apply(subject, cmd, area(cmd.areaId()));
        audit.record(actor, "UPDATE_SUBJECT", SUBJECT, subject.getCode(), before, snapshot(subject));
        return subject;
    }

    /** Ngừng cung cấp dịch vụ từ sau ngày {@code endDate}: đối tượng Đã chấm dứt, hợp đồng đang hiệu lực kết thúc. */
    public ServiceSubject end(Long id, LocalDate endDate, String reason, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        ServiceSubject subject = find(id);
        Map<String, Object> before = snapshot(subject);
        for (ServiceContract c : contracts.findBySubjectIdOrderByValidFromDesc(subject.getId())) {
            if (c.getValidTo() == null || c.getValidTo().isAfter(endDate)) {
                c.closeOn(endDate);
            }
        }
        subject.setStatus(SubjectStatus.ENDED);
        if (reason != null && !reason.isBlank()) {
            subject.setNote(reason.trim());
        }
        Map<String, Object> after = snapshot(subject);
        after.put("endDate", endDate);
        audit.record(actor, "END_SUBJECT", SUBJECT, subject.getCode(), before, after);
        return subject;
    }

    public ServiceContract addContract(Long subjectId, ContractCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        ServiceSubject subject = find(subjectId);
        ServiceContract saved = saveContract(subject, cmd, actor);
        if (subject.getStatus() == SubjectStatus.PENDING) {
            subject.setStatus(SubjectStatus.ACTIVE);
        }
        return saved;
    }

    public ServiceContract updateContract(Long contractId, ContractCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        ServiceContract contract = contracts.findById(contractId)
                .orElseThrow(() -> new NotFoundException("CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng."));
        requireNoOverlap(contract.getSubject().getId(), cmd.validFrom(), cmd.validTo(), contract.getId());
        Map<String, Object> before = snapshot(contract);
        contract.change(cmd.tariffGroup(), cmd.validFrom(), cmd.validTo(), cmd.exempt(), cmd.exemptReason(),
                cmd.exemptDecisionNo());
        contract.setNote(cmd.note());
        audit.record(actor, "UPDATE_CONTRACT", CONTRACT, contract.getContractNo(), before, snapshot(contract));
        return contract;
    }

    @Transactional(readOnly = true)
    public ServiceSubject get(Long id, CurrentUser actor) {
        ServiceSubject subject = find(id);
        if (actor.role().belongsToCompany() && !Objects.equals(
                assignments.companyOf(subject.getArea().getId(), LocalDate.now()).orElse(null), actor.companyId())) {
            throw notFound();
        }
        return subject;
    }

    @Transactional(readOnly = true)
    public Page<ServiceSubject> search(SubjectFilter f, Pageable page, CurrentUser actor) {
        boolean scoped = actor.role().belongsToCompany();
        List<Long> areaIds = scoped
                ? assignments.activeOn(LocalDate.now(), actor).stream().map(a -> a.getArea().getId()).toList()
                : List.of();
        if (scoped && areaIds.isEmpty()) {
            return Page.empty(page);
        }
        String q = f.q() == null || f.q().isBlank() ? "" : "%" + f.q().trim().toLowerCase(Locale.ROOT) + "%";
        return subjects.search(f.districtId(), f.areaId(), f.status(), scoped, scoped ? areaIds : List.of(-1L), q, page);
    }

    @Transactional(readOnly = true)
    public List<ServiceContract> contractsOf(Long subjectId) {
        return contracts.findBySubjectIdOrderByValidFromDesc(subjectId);
    }

    @Transactional(readOnly = true)
    public Map<Long, List<ServiceContract>> contractsOf(List<Long> subjectIds) {
        Map<Long, List<ServiceContract>> result = new LinkedHashMap<>();
        subjectIds.forEach(id -> result.put(id, new ArrayList<>()));
        contracts.findBySubjectIdIn(subjectIds).forEach(c -> result.get(c.getSubject().getId()).add(c));
        return result;
    }

    /** Hợp đồng hiệu lực của đối tượng vào ngày {@code date} (dùng khi lập khoản, T17). */
    @Transactional(readOnly = true)
    public Optional<ServiceContract> activeContract(Long subjectId, LocalDate date) {
        return contracts.findBySubjectIdOrderByValidFromDesc(subjectId).stream().filter(c -> c.covers(date)).findFirst();
    }

    private ServiceContract saveContract(ServiceSubject subject, ContractCommand cmd, CurrentUser actor) {
        requireNoOverlap(subject.getId(), cmd.validFrom(), cmd.validTo(), null);
        String prefix = "ĐK-" + subject.getArea().getDistrict().getCode() + "-";
        String no = prefix + String.format("%04d", contracts.maxContractNumber(prefix) + 1);
        ServiceContract contract = ServiceContract.create(no, subject, cmd.tariffGroup(), cmd.validFrom(), cmd.validTo(),
                cmd.exempt(), cmd.exemptReason(), cmd.exemptDecisionNo());
        contract.setNote(cmd.note());
        ServiceContract saved = contracts.save(contract);
        audit.record(actor, "CREATE_CONTRACT", CONTRACT, saved.getContractNo(), null, snapshot(saved));
        return saved;
    }

    private void requireNoOverlap(Long subjectId, LocalDate from, LocalDate to, Long exceptContractId) {
        if (subjectId == null) {
            return;
        }
        contracts.findBySubjectIdOrderByValidFromDesc(subjectId).stream()
                .filter(c -> exceptContractId == null || !exceptContractId.equals(c.getId()))
                .filter(c -> c.overlaps(from, to))
                .findFirst()
                .ifPresent(c -> {
                    throw new BusinessRuleException("CONTRACT_OVERLAP", "Đối tượng đã có hợp đồng " + c.getContractNo()
                            + " còn hiệu lực trong khoảng thời gian này.");
                });
    }

    private void apply(ServiceSubject s, SubjectCommand cmd, Area area) {
        s.setArea(area);
        s.setPhone(blankToNull(cmd.phone()));
        s.setMemberCount(cmd.type() == SubjectType.HOUSEHOLD ? cmd.memberCount() : null);
        s.setRepresentativeName(blankToNull(cmd.representativeName()));
        s.setTaxCode(blankToNull(cmd.taxCode()));
        s.setNote(blankToNull(cmd.note()));
    }

    private Area area(Long id) {
        return areas.findByIdWithDistrict(id).orElseThrow(() -> new NotFoundException("AREA_NOT_FOUND", "Không tìm thấy khu vực."));
    }

    private ServiceSubject find(Long id) {
        return subjects.findByIdWithArea(id).orElseThrow(SubjectService::notFound);
    }

    private static NotFoundException notFound() {
        return new NotFoundException("SUBJECT_NOT_FOUND", "Không tìm thấy hồ sơ hộ.");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static Map<String, Object> snapshot(ServiceSubject s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", s.getCode());
        m.put("type", s.getSubjectType());
        m.put("name", s.getName());
        m.put("address", s.getAddress());
        m.put("area", s.getArea().getCode());
        m.put("phone", s.getPhone());
        m.put("status", s.getStatus());
        m.put("memberCount", s.getMemberCount());
        return m;
    }

    private static Map<String, Object> snapshot(ServiceContract c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("contractNo", c.getContractNo());
        m.put("subject", c.getSubject().getCode());
        m.put("tariffGroup", c.getTariffGroup());
        m.put("validFrom", c.getValidFrom());
        m.put("validTo", c.getValidTo());
        m.put("exempt", c.isExempt());
        m.put("exemptReason", c.getExemptReason());
        return m;
    }
}
