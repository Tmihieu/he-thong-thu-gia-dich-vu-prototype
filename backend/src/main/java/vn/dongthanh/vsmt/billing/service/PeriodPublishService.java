package vn.dongthanh.vsmt.billing.service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueCommand;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueResult;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.service.TariffService;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Cán bộ xã duyệt kỳ dự thảo (xã chốt 04/10/2026): xem trước các khoản sẽ lập rồi "Mở kỳ & phát hành". Mở kỳ và phát
 * hành phiếu yêu cầu thu (mặc định phí vệ sinh môi trường cho toàn xã, hoặc theo phạm vi cán bộ xã chọn) nằm trong một transaction: lỗi ở khâu lập khoản thì kỳ vẫn
 * là Dự thảo. Phát hành dùng đúng {@link ChargeRequestService} nên cùng quy tắc R2 với phiếu YCT lập tay.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PeriodPublishService {

    static final String ENTITY = "CollectionPeriod";
    static final String ENV_FEE_CODE = "ENV";

    private final CollectionPeriodRepository periods;
    private final FeeTypeRepository feeTypes;
    private final TariffService tariffs;
    private final ChargeRequestService chargeRequests;
    private final AuditService audit;

    public record DraftPreview(CollectionPeriod period, IssueResult result) {
    }

    public record PublishResult(CollectionPeriod period, IssueResult result) {
    }

    /** Phạm vi phiếu khi mở kỳ; {@code null} = phí vệ sinh môi trường cho toàn xã. */
    public record Scope(Long feeTypeId, ChargeScope scopeType, List<Long> areaIds, Long companyId, Long unitPrice) {
    }

    /**
     * Xem trước các khoản sẽ lập khi mở kỳ. Kỳ dự thảo lấy lại biểu giá hiệu lực tại ngày đầu kỳ (biểu giá có thể
     * vừa được ban hành sau lúc hệ thống tạo dự thảo), nên số tiền xem trước khớp với lúc mở kỳ.
     */
<<<<<<< HEAD
    @Transactional(readOnly = true)
    public DraftPreview preview(Long periodId, LocalDate openDate, LocalDate companyDueDate,
=======
    public DraftPreview preview(Long periodId, LocalDate openDate, LocalDate dueDate,
>>>>>>> origin/main
            Scope scope, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN);
        CollectionPeriod period = periods.findByIdWithTariff(periodId).orElseThrow(PeriodPublishService::notFound);
        requireDraft(period);
        refreshTariff(period);
        schedule(period, openDate, dueDate);
        return new DraftPreview(period, chargeRequests.previewDraft(command(period, null, scope), actor));
    }

    public PublishResult publish(Long periodId, LocalDate openDate, LocalDate dueDate,
            String note, Scope scope, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN);
        // Khóa dòng kỳ: hai cán bộ cùng bấm thì người sau thấy kỳ đã mở.
        CollectionPeriod period = periods.findByIdForUpdate(periodId).orElseThrow(PeriodPublishService::notFound);
        requireDraft(period);
        TariffVersion tariff = refreshTariff(period);
        schedule(period, openDate, dueDate);
        IssueCommand cmd = command(period, note, scope);

        period.publish();
        // Đẩy trạng thái COLLECTING xuống CSDL trước khi phát hành: PeriodGuard đọc lại trạng thái bằng FOR SHARE.
        periods.saveAndFlush(period);
        IssueResult result = chargeRequests.publish(cmd, actor);

        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", period.getStatus());
        after.put("tariffVersion", tariff.getCode());
        after.put("openDate", period.getOpenDate());
        after.put("dueDate", period.getDueDate());
        after.put("requestCode", result.requestCode());
        after.put("chargeCount", result.chargeCount());
        after.put("totalAmount", result.totalAmount());
        audit.record(actor, "PUBLISH_PERIOD", ENTITY, period.getCode(), Map.of("status", PeriodStatus.DRAFT), after);
        return new PublishResult(period, result);
    }

    /** Cán bộ xã đặt ngày mở / hạn nộp (hạn duy nhất của kỳ) (trống thì giữ giá trị của dự thảo). */
    private static void schedule(CollectionPeriod period, LocalDate openDate, LocalDate dueDate) {
        if (openDate != null || dueDate != null) {
            period.schedule(openDate != null ? openDate : period.getOpenDate(),
                    dueDate != null ? dueDate : period.getDueDate());
        }
    }

    private static void requireDraft(CollectionPeriod period) {
        if (period.getStatus() != PeriodStatus.DRAFT) {
            throw new BusinessRuleException("PERIOD_NOT_DRAFT", "Kỳ " + period.getCode()
                    + " không còn ở dạng dự thảo (" + period.getStatus().label() + ").");
        }
    }

    private TariffVersion refreshTariff(CollectionPeriod period) {
        TariffVersion current = tariffs.activeVersionOn(period.getStartDate());
        if (!current.getId().equals(period.getTariffVersion().getId())) {
            period.useTariff(current);
        }
        return current;
    }

    private IssueCommand command(CollectionPeriod period, String note, Scope scope) {
        if (scope != null && scope.scopeType() != null) {
            Long feeTypeId = scope.feeTypeId() != null ? scope.feeTypeId() : envFeeType().getId();
            return new IssueCommand(period.getId(), feeTypeId, scope.scopeType(), scope.areaIds(), scope.companyId(),
                    scope.unitPrice(), note);
        }
        return new IssueCommand(period.getId(), envFeeType().getId(), ChargeScope.ALL, null, null, null, note);
    }

    private FeeType envFeeType() {
        return feeTypes.findByCode(ENV_FEE_CODE).orElseThrow(() -> new NotFoundException("FEE_TYPE_NOT_FOUND",
                "Chưa có loại phí vệ sinh môi trường (" + ENV_FEE_CODE + ") để lập khoản."));
    }

    private static NotFoundException notFound() {
        return new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu.");
    }
}
