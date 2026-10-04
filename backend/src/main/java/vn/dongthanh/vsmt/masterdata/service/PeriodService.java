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
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Khóa kỳ (cán bộ xã, G1) và tra cứu kỳ thu. Quản trị tạo kỳ dự thảo ở {@link PeriodAutoService#createDraft}. */
@Service
@RequiredArgsConstructor
@Transactional
public class PeriodService {

    static final String ENTITY = "CollectionPeriod";

    private final CollectionPeriodRepository periods;
    private final AuditService audit;
    private final Clock clock;

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
