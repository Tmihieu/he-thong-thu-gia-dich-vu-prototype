package vn.dongthanh.vsmt.masterdata.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.ActiveStatus;
import vn.dongthanh.vsmt.masterdata.domain.AddressText;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContractRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.masterdata.domain.Street;
import vn.dongthanh.vsmt.masterdata.domain.StreetRepository;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
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
    private final StreetRepository streets;
    private final AreaAssignmentService assignments;
    private final AuditService audit;
    private final ApplicationEventPublisher events;
    private final CollectionPeriodRepository periods;
    private final Clock clock;

    /**
     * @param streetId        đường chuẩn trong danh mục; null thì {@code street} là tên tạm (chờ xác minh) hoặc địa chỉ cũ
     * @param duplicateReason lý do xác nhận "là hộ khác" khi địa chỉ nghi trùng hồ sơ có sẵn
     */
    public record SubjectCommand(SubjectType type, String name, String houseNo, String street, Long areaId, String phone,
            Integer memberCount, String representativeName, String taxCode, String note, Long streetId,
            boolean streetPending, String unitNo, String locationNote, String duplicateReason) {
    }

    public record ContractCommand(TariffGroup tariffGroup, LocalDate validFrom, LocalDate validTo, boolean exempt,
            String exemptReason, String exemptDecisionNo, String note, Integer quotaKg) {

        public ContractCommand(TariffGroup tariffGroup, LocalDate validFrom, LocalDate validTo, boolean exempt,
                String exemptReason, String exemptDecisionNo, String note) {
            this(tariffGroup, validFrom, validTo, exempt, exemptReason, exemptDecisionNo, note, null);
        }
    }

    public record SubjectFilter(Long districtId, Long areaId, SubjectStatus status, SubjectType subjectType, String q) {
    }

    public ServiceSubject create(SubjectCommand cmd, ContractCommand contract, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        Area area = area(cmd.areaId());
        String prefix = area.getDistrict().getCode() + "-" + cmd.type().codePrefix();
        int digits = 7 - cmd.type().codePrefix().length();
        String code = prefix + String.format("%0" + digits + "d", subjects.maxCodeNumber(prefix) + 1);

        Street street = resolveStreet(cmd, null);
        List<ServiceSubject> twins = suspectedDuplicates(area.getId(), street, cmd.houseNo(), cmd.unitNo(), null);
        requireDuplicateReason(twins, cmd);

        ServiceSubject subject = ServiceSubject.create(code, cmd.type(), cmd.name().trim(), blankToNull(cmd.houseNo()),
                street != null ? street.getName() : cmd.street().trim(), area);
        applyAddress(subject, cmd, street);
        apply(subject, cmd, area);
        if (contract != null) {
            requireGroupFits(subject, contract);
            // Kiểm tra hợp đồng trước khi lưu đối tượng để lỗi không để lại đối tượng dở dang.
            ServiceContract.create("tmp", subject, contract.tariffGroup(), contract.validFrom(), contract.validTo(),
                    contract.exempt(), contract.exemptReason(), contract.exemptDecisionNo());
            subject.setStatus(SubjectStatus.ACTIVE);
        }
        ServiceSubject saved = subjects.save(subject);
        audit.record(actor, "CREATE_SUBJECT", SUBJECT, saved.getCode(), null,
                withDuplicateNote(snapshot(saved), twins, cmd));
        if (contract != null) {
            saveContract(saved, contract, actor);
        }
        return saved;
    }

    public ServiceSubject update(Long id, SubjectCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        ServiceSubject subject = find(id);
        Map<String, Object> before = snapshot(subject);
        Area area = area(cmd.areaId());
        Street street = resolveStreet(cmd, subject);
        // Chỉ hỏi lại khi địa chỉ đổi: sửa SĐT của hộ vốn đã trùng không bị chặn lại.
        List<ServiceSubject> twins = addressKey(subject).equals(addressKey(area.getId(), street, cmd.houseNo(), cmd.unitNo()))
                ? List.of()
                : suspectedDuplicates(area.getId(), street, cmd.houseNo(), cmd.unitNo(), subject.getId());
        requireDuplicateReason(twins, cmd);
        Integer membersBefore = subject.getMemberCount();
        if (cmd.type() != subject.getSubjectType()) {
            requireOpenContractsFit(subject, cmd.type());
        }
        subject.setSubjectType(cmd.type());
        subject.setName(cmd.name().trim());
        applyAddress(subject, cmd, street);
        apply(subject, cmd, area);
        audit.record(actor, "UPDATE_SUBJECT", SUBJECT, subject.getCode(), before,
                withDuplicateNote(snapshot(subject), twins, cmd));
        syncHouseholdGroup(subject, membersBefore, actor);
        return subject;
    }

    /**
     * Số người của hộ đổi thì nhóm giá hộ gia đình (≤2 / ≥3) đổi theo, áp từ kỳ sau (xã chốt 03/10): hợp đồng đang mở
     * kết thúc hết kỳ đang chạy, hợp đồng mới cùng nhóm mới bắt đầu ngày đầu kỳ kế tiếp. Chưa có kỳ nào đang chạy, hoặc
     * hợp đồng chưa bắt đầu, thì đổi tại chỗ. Khoản đã phát hành luôn giữ nhóm giá của nó.
     */
    private void syncHouseholdGroup(ServiceSubject subject, Integer membersBefore, CurrentUser actor) {
        Integer now = subject.getMemberCount();
        if (subject.getSubjectType() != SubjectType.HOUSEHOLD || now == null || now.equals(membersBefore)) {
            return;
        }
        TariffGroup expected = now <= 2 ? TariffGroup.HH_UP_TO_2 : TariffGroup.HH_3_PLUS;
        LocalDate effective = nextPeriodStart();
        for (ServiceContract c : contracts.findBySubjectIdOrderByValidFromDesc(subject.getId())) {
            boolean householdGroup = c.getTariffGroup() == TariffGroup.HH_UP_TO_2 || c.getTariffGroup() == TariffGroup.HH_3_PLUS;
            // Đăng ký có ngày kết thúc ở tương lai vẫn đang hiệu lực: cũng phải đổi nhóm (chỉ bỏ đăng ký đã hết).
            boolean closed = c.getValidTo() != null && c.getValidTo().isBefore(LocalDate.now(clock));
            if (closed || !householdGroup || c.getTariffGroup() == expected) {
                continue;
            }
            Map<String, Object> before = snapshot(c);
            LocalDate originalEnd = c.getValidTo();
            if (effective != null && originalEnd != null && originalEnd.isBefore(effective)) {
                continue; // hết hiệu lực trước kỳ sau: không còn gì để nối tiếp
            }
            if (effective == null || !c.getValidFrom().isBefore(effective)) {
                c.change(expected, c.getValidFrom(), c.getValidTo(), c.isExempt(), c.getExemptReason(), c.getExemptDecisionNo());
                audit.record(actor, "UPDATE_CONTRACT", CONTRACT, c.getContractNo(), before, snapshot(c));
            } else {
                c.closeOn(effective.minusDays(1));
                audit.record(actor, "UPDATE_CONTRACT", CONTRACT, c.getContractNo(), before, snapshot(c));
                // Hợp đồng nối tiếp giữ nguyên miễn giảm và định mức; không phát lại sự kiện miễn để khỏi tạo đề nghị trùng.
                createContract(subject, new ContractCommand(expected, effective, originalEnd, c.isExempt(), c.getExemptReason(),
                        c.getExemptDecisionNo(), c.getNote(), c.getQuotaKg()), actor, false);
            }
        }
    }

    /** Ngày đầu kỳ sau (ngày sau kỳ đang chạy muộn nhất); null nếu chưa có kỳ nào đang chạy. */
    private LocalDate nextPeriodStart() {
        return periods.findCovering(LocalDate.now(clock)).stream().map(CollectionPeriod::getEndDate)
                .max(Comparator.naturalOrder()).map(d -> d.plusDays(1)).orElse(null);
    }

    /** Đổi loại đối tượng: đăng ký còn hiệu lực phải dùng nhóm giá hợp loại mới, không thì sửa đăng ký trước. */
    private void requireOpenContractsFit(ServiceSubject subject, SubjectType type) {
        for (ServiceContract c : contracts.findBySubjectIdOrderByValidFromDesc(subject.getId())) {
            boolean closed = c.getValidTo() != null && c.getValidTo().isBefore(LocalDate.now(clock));
            if (!closed && !type.allows(c.getTariffGroup())) {
                throw new BusinessRuleException("TARIFF_GROUP_MISMATCH", "Đăng ký thu phí " + c.getContractNo()
                        + " dùng nhóm giá không hợp loại mới; kết thúc hoặc sửa đăng ký trước khi đổi loại.");
            }
        }
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
                .orElseThrow(() -> new NotFoundException("CONTRACT_NOT_FOUND", "Không tìm thấy đăng ký thu phí."));
        requireNoOverlap(contract.getSubject().getId(), cmd.validFrom(), cmd.validTo(), contract.getId());
        requireGroupFits(contract.getSubject(), cmd);
        Map<String, Object> before = snapshot(contract);
        boolean wasExempt = contract.isExempt();
        // Đổi cách tính áp dụng từ kỳ sau (họp công ty 05/10): đăng ký đã chạy qua kỳ đang thu thì giữ nhóm cũ đến hết
        // kỳ, nhóm mới nằm ở đăng ký nối tiếp từ ngày đầu kỳ sau.
        LocalDate effective = nextPeriodStart();
        if (cmd.tariffGroup() != contract.getTariffGroup() && effective != null
                && cmd.validFrom().isBefore(effective) && (cmd.validTo() == null || !cmd.validTo().isBefore(effective))) {
            contract.change(contract.getTariffGroup(), cmd.validFrom(), effective.minusDays(1), cmd.exempt(),
                    cmd.exemptReason(), cmd.exemptDecisionNo());
            contract.setNote(cmd.note());
            audit.record(actor, "UPDATE_CONTRACT", CONTRACT, contract.getContractNo(), before, snapshot(contract));
            return createContract(contract.getSubject(), new ContractCommand(cmd.tariffGroup(), effective, cmd.validTo(),
                    cmd.exempt(), cmd.exemptReason(), cmd.exemptDecisionNo(), cmd.note(), cmd.quotaKg()), actor,
                    !wasExempt);
        }
        contract.change(cmd.tariffGroup(), cmd.validFrom(), cmd.validTo(), cmd.exempt(), cmd.exemptReason(),
                cmd.exemptDecisionNo());
        contract.setNote(cmd.note());
        contract.setQuotaKg(cmd.quotaKg());
        audit.record(actor, "UPDATE_CONTRACT", CONTRACT, contract.getContractNo(), before, snapshot(contract));
        if (!wasExempt && contract.isExempt()) {
            publishExempted(contract, actor);
        }
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
        return subjects.search(f.districtId(), f.areaId(), f.status(), f.subjectType(), scoped, scoped ? areaIds : List.of(-1L), q, page);
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
        return createContract(subject, cmd, actor, true);
    }

    private ServiceContract createContract(ServiceSubject subject, ContractCommand cmd, CurrentUser actor,
            boolean announceExempt) {
        requireNoOverlap(subject.getId(), cmd.validFrom(), cmd.validTo(), null);
        requireGroupFits(subject, cmd);
        String prefix = "ĐK-" + subject.getArea().getDistrict().getCode() + "-";
        String no = prefix + String.format("%04d", contracts.maxContractNumber(prefix) + 1);
        ServiceContract contract = ServiceContract.create(no, subject, cmd.tariffGroup(), cmd.validFrom(), cmd.validTo(),
                cmd.exempt(), cmd.exemptReason(), cmd.exemptDecisionNo());
        contract.setNote(cmd.note());
        contract.setQuotaKg(cmd.quotaKg());
        ServiceContract saved = contracts.save(contract);
        audit.record(actor, "CREATE_CONTRACT", CONTRACT, saved.getContractNo(), null, snapshot(saved));
        if (announceExempt && saved.isExempt()) {
            publishExempted(saved, actor);
        }
        return saved;
    }

    private void publishExempted(ServiceContract contract, CurrentUser actor) {
        events.publishEvent(new ContractExemptedEvent(contract.getId(), contract.getExemptReason(),
                contract.getExemptDecisionNo(), actor));
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
                    throw new BusinessRuleException("CONTRACT_OVERLAP", "Đối tượng đã có đăng ký thu phí " + c.getContractNo()
                            + " còn hiệu lực trong khoảng thời gian này.");
                });
    }

    /**
     * Nhóm giá phải hợp loại đối tượng ({@link SubjectType#allows}); nhóm ≤2 / ≥3 người phải khớp số thành viên hiện tại.
     * Chỉ bỏ qua hợp đồng đã hết hiệu lực (ngày kết thúc trước hôm nay): hợp đồng đã đóng phản ánh hồ sơ lúc đó.
     */
    private void requireGroupFits(ServiceSubject s, ContractCommand cmd) {
        // Đăng ký có ngày kết thúc ở tương lai vẫn còn hiệu lực nên phải khớp; chỉ đăng ký đã hết mới là lịch sử.
        if (cmd.validTo() != null && cmd.validTo().isBefore(LocalDate.now(clock))) {
            return;
        }
        if (!s.getSubjectType().allows(cmd.tariffGroup())) {
            throw new BusinessRuleException("TARIFF_GROUP_MISMATCH", switch (s.getSubjectType()) {
                case HOUSEHOLD -> "Hộ gia đình chỉ dùng nhóm giá theo số người hoặc theo nhân khẩu.";
                case SMALL_SOURCE -> "Nguồn thải nhỏ không dùng nhóm giá hộ gia đình.";
                case LARGE_SOURCE -> "Nguồn thải lớn chỉ tính theo cân (có phí xử lý).";
            });
        }
        boolean byMembers = cmd.tariffGroup() == TariffGroup.HH_UP_TO_2 || cmd.tariffGroup() == TariffGroup.HH_3_PLUS;
        TariffGroup expected = s.getMemberCount() != null && s.getMemberCount() <= 2 ? TariffGroup.HH_UP_TO_2 : TariffGroup.HH_3_PLUS;
        if (byMembers && cmd.tariffGroup() != expected) {
            throw new BusinessRuleException("TARIFF_GROUP_MISMATCH", "Hộ có " + s.getMemberCount()
                    + " thành viên phải áp nhóm " + (expected == TariffGroup.HH_UP_TO_2 ? "≤2 người" : "từ 3 người") + ".");
        }
    }

    /** Hồ sơ nghi trùng địa chỉ với địa chỉ đang nhập (kể cả đã ngừng), cho màn hình cảnh báo. */
    @Transactional(readOnly = true)
    public List<ServiceSubject> findSuspectedDuplicates(Long areaId, Long streetId, String houseNo, String unitNo,
            Long excludeSubjectId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        Area area = area(areaId);
        Street street = streetId == null ? null : resolveStreet(streetId, null);
        return suspectedDuplicates(area.getId(), street, houseNo, unitNo, excludeSubjectId);
    }

    /**
     * Cùng tổ/ấp + đường chuẩn + số nhà chuẩn hóa (giữ "/" và hậu tố), phân biệt thêm theo phòng/căn nếu cả hai đều
     * có. Số nhà trống hoặc chưa chọn đường chuẩn thì không phải bằng chứng: trả rỗng. Chỉ là dấu hiệu, không chặn tuyệt đối.
     */
    private List<ServiceSubject> suspectedDuplicates(Long areaId, Street street, String houseNo, String unitNo,
            Long excludeId) {
        String house = AddressText.houseKey(houseNo);
        if (street == null || house.isEmpty()) {
            return List.of();
        }
        String unit = AddressText.unitKey(unitNo);
        return subjects.findByAddressSlot(areaId, street.getId(), excludeId).stream()
                .filter(o -> house.equals(AddressText.houseKey(o.getHouseNo())))
                .filter(o -> {
                    String ou = AddressText.unitKey(o.getUnitNo());
                    return unit.isEmpty() || ou.isEmpty() || unit.equals(ou);
                }).toList();
    }

    private static void requireDuplicateReason(List<ServiceSubject> twins, SubjectCommand cmd) {
        if (!twins.isEmpty() && blankToNull(cmd.duplicateReason()) == null) {
            throw new ConflictException("DUPLICATE_SUSPECTED", "Địa chỉ này trùng với hồ sơ "
                    + String.join(", ", twins.stream().map(ServiceSubject::getCode).toList())
                    + ". Mở hồ sơ đã có, hoặc ghi lý do xác nhận đây là hộ khác.");
        }
    }

    private static Map<String, Object> withDuplicateNote(Map<String, Object> snapshot, List<ServiceSubject> twins,
            SubjectCommand cmd) {
        if (!twins.isEmpty()) {
            snapshot.put("duplicateReason", cmd.duplicateReason().trim());
            snapshot.put("duplicateOf", twins.stream().map(ServiceSubject::getCode).toList());
        }
        return snapshot;
    }

    private static String addressKey(ServiceSubject s) {
        return addressKey(s.getArea().getId(), s.getStreetRef(), s.getHouseNo(), s.getUnitNo());
    }

    private static String addressKey(Long areaId, Street street, String houseNo, String unitNo) {
        return areaId + "|" + (street == null ? "" : street.getId()) + "|" + AddressText.houseKey(houseNo) + "|"
                + AddressText.unitKey(unitNo);
    }

    private Street resolveStreet(SubjectCommand cmd, ServiceSubject existing) {
        if (cmd.streetId() == null) {
            if (cmd.street() == null || cmd.street().isBlank()) {
                throw new BusinessRuleException("STREET_REQUIRED",
                        "Chọn đường trong danh mục hoặc nhập tên đường chờ xác minh.");
            }
            return null;
        }
        return resolveStreet(cmd.streetId(), existing);
    }

    /** Đường/hẻm thuộc cả xã (nhà giáp ranh có thể ở đường của ấp bên cạnh); đường đã ngừng dùng chỉ giữ được nếu hồ sơ đang dùng sẵn. */
    private Street resolveStreet(Long streetId, ServiceSubject existing) {
        Street street = streets.findByIdWithParent(streetId)
                .orElseThrow(() -> new NotFoundException("STREET_NOT_FOUND", "Không tìm thấy đường trong danh mục."));
        boolean kept = existing != null && existing.getStreetRef() != null
                && existing.getStreetRef().getId().equals(streetId);
        if (street.getStatus() != ActiveStatus.ACTIVE && !kept) {
            throw new BusinessRuleException("STREET_INACTIVE", street.getDisplayName() + " đã ngừng dùng trong danh mục.");
        }
        return street;
    }

    private static void applyAddress(ServiceSubject s, SubjectCommand cmd, Street street) {
        s.setStructuredAddress(blankToNull(cmd.houseNo()), blankToNull(cmd.unitNo()), blankToNull(cmd.locationNote()),
                street, cmd.street() == null ? null : cmd.street().trim(), cmd.streetPending());
    }

    private void apply(ServiceSubject s, SubjectCommand cmd, Area area) {
        if (cmd.type() == SubjectType.HOUSEHOLD && cmd.memberCount() == null) {
            throw new BusinessRuleException("MEMBER_COUNT_REQUIRED", "Hộ gia đình phải nhập số thành viên.");
        }
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
        m.put("houseNo", s.getHouseNo());
        m.put("street", s.getStreet());
        m.put("streetId", s.getStreetRef() == null ? null : s.getStreetRef().getId());
        m.put("streetPending", s.isStreetPending());
        m.put("unitNo", s.getUnitNo());
        m.put("locationNote", s.getLocationNote());
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
        m.put("quotaKg", c.getQuotaKg());
        return m;
    }
}
