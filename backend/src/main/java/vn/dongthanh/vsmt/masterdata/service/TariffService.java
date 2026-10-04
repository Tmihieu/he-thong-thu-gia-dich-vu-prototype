package vn.dongthanh.vsmt.masterdata.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffRate;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersionRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Quản trị soạn, ban hành và sửa biểu giá; bản đã ban hành giữ hiệu lực, khoản đã lập giữ số tiền đã chụp.
 * Tra biểu giá theo ngày. Phiên bản áp dụng cho một ngày là phiên bản đã ban hành (không phải dự thảo)
 * có hiệu lực bao trùm ngày đó; phiên bản đã hết hiệu lực vẫn dùng được cho ngày trong quá khứ (kỳ 08/2026).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TariffService {

    static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    static final String ENTITY = "TariffVersion";

    private final TariffVersionRepository versions;
    private final FeeTypeRepository feeTypes;
    private final CollectionPeriodRepository periods;
    private final AuditService audit;
    private final Clock clock;

    public record RateInput(TariffGroup group, long collectionFee, long transportFee, String unitLabel) {
    }

    public record DraftCommand(String legalBasis, LocalDate validFrom, LocalDate validTo, String scopeNote,
            String note, List<RateInput> rates) {
    }

    public TariffVersion activeVersionOn(LocalDate date) {
        List<TariffVersion> covering = versions.findAllWithRatesByStatusNot(TariffStatus.DRAFT).stream()
                .filter(v -> v.covers(date))
                .toList();
        if (covering.isEmpty()) {
            throw new BusinessRuleException("TARIFF_NOT_FOUND",
                    "Không có biểu giá có hiệu lực vào ngày " + VN_DATE.format(date) + ".");
        }
        if (covering.size() == 1) {
            return covering.get(0);
        }
        // Chồng lấn chỉ có thể giữa một bản ACTIVE và bản đã hết hiệu lực: ưu tiên bản đang áp dụng.
        List<TariffVersion> active = covering.stream().filter(v -> v.getStatus() == TariffStatus.ACTIVE).toList();
        if (active.size() == 1) {
            return active.get(0);
        }
        throw new BusinessRuleException("TARIFF_AMBIGUOUS", "Có nhiều biểu giá cùng hiệu lực vào ngày "
                + VN_DATE.format(date) + ": " + covering.stream().map(TariffVersion::getCode).toList()
                + ". Vui lòng điều chỉnh hiệu lực biểu giá.");
    }

    public TariffRate rateOn(LocalDate date, TariffGroup group) {
        TariffVersion version = activeVersionOn(date);
        return version.rateFor(group).orElseThrow(() -> new BusinessRuleException("TARIFF_RATE_NOT_FOUND",
                "Biểu giá " + version.getCode() + " chưa có đơn giá cho nhóm " + group + "."));
    }

    @Transactional
    public TariffVersion createDraft(String code, DraftCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        String trimmed = code.trim();
        if (versions.findByCode(trimmed).isPresent()) {
            throw new ConflictException("TARIFF_CODE_EXISTS", "Mã biểu giá " + trimmed + " đã có.");
        }
        TariffVersion v = TariffVersion.create(trimmed, cmd.legalBasis().trim(), cmd.validFrom(), cmd.validTo(),
                TariffStatus.DRAFT);
        apply(v, cmd);
        TariffVersion saved = versions.save(v);
        audit.record(actor, "CREATE_TARIFF_DRAFT", ENTITY, saved.getCode(), null, snapshot(saved));
        return saved;
    }

    @Transactional
    public TariffVersion updateDraft(Long id, DraftCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        TariffVersion v = versions.findById(id)
                .orElseThrow(() -> new NotFoundException("TARIFF_NOT_FOUND", "Không tìm thấy biểu giá."));
        boolean issued = v.getStatus() != TariffStatus.DRAFT;
        if (issued && (!Objects.equals(v.getValidFrom(), cmd.validFrom())
                || !Objects.equals(v.getValidTo(), cmd.validTo()))) {
            throw new BusinessRuleException("TARIFF_VALIDITY_LOCKED",
                    "Biểu giá đã ban hành giữ nguyên ngày hiệu lực. Hãy tạo phiên bản mới để đổi thời gian áp dụng.");
        }
        Map<String, Object> before = snapshot(v);
        apply(v, cmd);
        audit.record(actor, issued ? "UPDATE_TARIFF_VERSION" : "UPDATE_TARIFF_DRAFT", ENTITY,
                v.getCode(), before, snapshot(v));
        return v;
    }

    /**
     * Ban hành dự thảo. Bản đang áp dụng bắt đầu trước ngày hiệu lực mới thì kết thúc ngay trước ngày đó. Chặn khi đã
     * mở kỳ bắt đầu từ ngày hiệu lực trở đi (kỳ đó đã gắn giá cũ), khi bản cũ bị thay hết, hoặc khi bản cũ bị cắt đôi.
     */
    @Transactional
    public TariffVersion issue(Long id, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        TariffVersion v = draft(id);
        LocalDate from = v.getValidFrom();
        periods.findFirstByStartDateGreaterThanEqualAndStatusNotOrderByStartDateAsc(from, PeriodStatus.DRAFT).ifPresent(p -> {
            throw new BusinessRuleException("TARIFF_PERIOD_ALREADY_OPEN", "Đã mở " + p.getLabel()
                    + " theo biểu giá cũ; ngày hiệu lực của biểu giá mới phải sau ngày đầu kỳ đó.");
        });
        LocalDate today = LocalDate.now(clock);
        for (TariffVersion old : versions.findAllWithRatesByStatusNot(TariffStatus.DRAFT)) {
            if (old.getStatus() != TariffStatus.ACTIVE || !overlaps(old, v)) {
                continue;
            }
            if (!old.getValidFrom().isBefore(from)) {
                throw new BusinessRuleException("TARIFF_REPLACES_WHOLE", "Biểu giá " + old.getCode()
                        + " có hiệu lực từ " + VN_DATE.format(old.getValidFrom())
                        + "; ngày hiệu lực của biểu giá mới phải sau ngày đó.");
            }
            if (v.getValidTo() != null && (old.getValidTo() == null || old.getValidTo().isAfter(v.getValidTo()))) {
                throw new BusinessRuleException("TARIFF_SPLITS_OLD", "Biểu giá " + old.getCode()
                        + " còn hiệu lực sau ngày hết hạn của biểu giá mới; hãy để trống ngày hết hạn.");
            }
            Map<String, Object> before = new LinkedHashMap<>();
            before.put("validTo", old.getValidTo());
            before.put("status", old.getStatus());
            old.endBefore(from, today);
            audit.record(actor, "END_TARIFF_VERSION", ENTITY, old.getCode(), before,
                    Map.of("validTo", old.getValidTo(), "status", old.getStatus(), "replacedBy", v.getCode()));
        }
        versions.flush(); // kết thúc bản cũ trước khi bật bản mới để không vướng ràng buộc không chồng lấn
        v.issue(today);
        audit.record(actor, "ISSUE_TARIFF_VERSION", ENTITY, v.getCode(), Map.of("status", TariffStatus.DRAFT),
                snapshot(v));
        return v;
    }

    private static boolean overlaps(TariffVersion a, TariffVersion b) {
        boolean aEndsBeforeB = a.getValidTo() != null && a.getValidTo().isBefore(b.getValidFrom());
        boolean bEndsBeforeA = b.getValidTo() != null && b.getValidTo().isBefore(a.getValidFrom());
        return !aEndsBeforeB && !bEndsBeforeA;
    }

    private TariffVersion draft(Long id) {
        TariffVersion v = versions.findById(id)
                .orElseThrow(() -> new NotFoundException("TARIFF_NOT_FOUND", "Không tìm thấy biểu giá."));
        if (v.getStatus() != TariffStatus.DRAFT) {
            throw new BusinessRuleException("TARIFF_NOT_DRAFT",
                    "Biểu giá " + v.getCode() + " đã được ban hành.");
        }
        return v;
    }

    private static void apply(TariffVersion v, DraftCommand cmd) {
        if (cmd.validTo() != null && cmd.validTo().isBefore(cmd.validFrom())) {
            throw new BusinessRuleException("TARIFF_INVALID_RANGE", "Ngày hết hạn phải từ ngày hiệu lực trở đi.");
        }
        EnumSet<TariffGroup> given = EnumSet.noneOf(TariffGroup.class);
        cmd.rates().forEach(r -> given.add(r.group()));
        if (given.size() != cmd.rates().size() || !given.equals(EnumSet.allOf(TariffGroup.class))) {
            throw new BusinessRuleException("TARIFF_RATES_INCOMPLETE", "Biểu giá phải có đơn giá cho đủ các nhóm giá.");
        }
        v.setLegalBasis(cmd.legalBasis().trim());
        v.setValidFrom(cmd.validFrom());
        v.setValidTo(cmd.validTo());
        v.setScopeNote(cmd.scopeNote());
        v.setNote(cmd.note());
        cmd.rates().forEach(r -> v.putRate(r.group(), r.collectionFee(), r.transportFee(), r.unitLabel().trim()));
    }

    private static Map<String, Object> snapshot(TariffVersion v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", v.getCode());
        m.put("legalBasis", v.getLegalBasis());
        m.put("validFrom", v.getValidFrom());
        m.put("validTo", v.getValidTo());
        m.put("status", v.getStatus());
        m.put("scopeNote", v.getScopeNote());
        m.put("note", v.getNote());
        v.getRates().forEach(r -> m.put(r.getTariffGroup().name(), Map.of(
                "collectionFee", r.getCollectionFee(), "transportFee", r.getTransportFee(),
                "monthlyTotal", r.getMonthlyTotal(), "unitLabel", r.getUnitLabel())));
        return m;
    }

    public List<TariffVersion> versions() {
        return versions.findAllWithRates();
    }

    public List<FeeType> feeTypes() {
        return feeTypes.findAllByOrderByCodeAsc();
    }
}
