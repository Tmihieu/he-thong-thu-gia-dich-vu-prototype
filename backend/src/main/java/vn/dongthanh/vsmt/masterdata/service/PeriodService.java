package vn.dongthanh.vsmt.masterdata.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Mở kỳ thu và bắt đầu thu (quản trị, G1). Kỳ gắn phiên bản biểu giá có hiệu lực tại ngày đầu kỳ.
 * Khóa kỳ do cán bộ xã làm ở T32.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PeriodService {

    static final String ENTITY = "CollectionPeriod";

    private final CollectionPeriodRepository periods;
    private final TariffService tariffs;
    private final AuditService audit;
    private final Clock clock;

    public record OpenPeriodCommand(PeriodType type, int year, int number, LocalDate openDate, LocalDate dueDate,
            String note) {
    }

    public CollectionPeriod open(OpenPeriodCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        // Dựng kỳ tạm để kiểm tra số tháng/quý và sinh mã trước khi tra biểu giá.
        CollectionPeriod draft = CollectionPeriod.open(cmd.type(), cmd.year(), cmd.number(), cmd.openDate(),
                cmd.dueDate(), null);
        if (periods.existsByCode(draft.getCode())) {
            throw new ConflictException("PERIOD_ALREADY_EXISTS", "Kỳ " + draft.getCode() + " đã được mở trước đó.");
        }
        TariffVersion tariff = tariffs.activeVersionOn(draft.getStartDate());
        CollectionPeriod period = CollectionPeriod.open(cmd.type(), cmd.year(), cmd.number(), cmd.openDate(),
                cmd.dueDate(), tariff);
        period.setNote(cmd.note());
        CollectionPeriod saved = periods.save(period);
        audit.record(actor, "OPEN_PERIOD", ENTITY, saved.getCode(), null, snapshot(saved));
        return saved;
    }

    public CollectionPeriod startCollecting(Long id, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        CollectionPeriod period = get(id);
        PeriodStatus before = period.getStatus();
        period.startCollecting();
        audit.record(actor, "START_COLLECTING_PERIOD", ENTITY, period.getCode(), Map.of("status", before),
                Map.of("status", period.getStatus()));
        return period;
    }

    /**
     * Đặt kỳ sang Đã khóa. Chỉ gọi từ PeriodLockService (remittance) sau khi đã kiểm tra hết nợ bằng sổ công ty–kỳ
     * (G15) và đã khóa dòng kỳ trong transaction.
     */
    public CollectionPeriod markLocked(CollectionPeriod period, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        PeriodStatus before = period.getStatus();
        period.lock(OffsetDateTime.now(clock), actor.id());
        audit.record(actor, "LOCK_PERIOD", ENTITY, period.getCode(), Map.of("status", before),
                Map.of("status", period.getStatus(), "lockedAt", period.getLockedAt()));
        return period;
    }

    @Transactional(readOnly = true)
    public List<CollectionPeriod> list() {
        return periods.findAllWithTariff();
    }

    /** Các kỳ chứa ngày {@code date}; có thể có cả kỳ tháng và kỳ quý. */
    @Transactional(readOnly = true)
    public List<CollectionPeriod> covering(LocalDate date) {
        return periods.findCovering(date);
    }

    @Transactional(readOnly = true)
    public CollectionPeriod get(Long id) {
        return periods.findByIdWithTariff(id)
                .orElseThrow(() -> new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu."));
    }

    private static Map<String, Object> snapshot(CollectionPeriod p) {
        return Map.of("code", p.getCode(), "type", p.getPeriodType(), "startDate", p.getStartDate(),
                "endDate", p.getEndDate(), "openDate", p.getOpenDate(), "dueDate", p.getDueDate(),
                "tariffVersion", p.getTariffVersion().getCode(), "status", p.getStatus());
    }
}
