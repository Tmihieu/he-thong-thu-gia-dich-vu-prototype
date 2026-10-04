package vn.dongthanh.vsmt.billing.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
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
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService;
import vn.dongthanh.vsmt.masterdata.service.TariffService;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Cán bộ xã duyệt kỳ dự thảo (xã chốt 04/10/2026): xem trước các khoản sẽ lập rồi "Mở kỳ & phát hành". Mở kỳ và phát
 * hành phiếu yêu cầu thu phí vệ sinh môi trường cho toàn xã nằm trong một transaction: lỗi ở khâu lập khoản thì kỳ vẫn
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
    private final PeriodAutoService auto;
    private final ChargeRequestService chargeRequests;
    private final AuditService audit;
    private final Clock clock;

    /** @param dueDate hạn hộ đóng đã dùng cho lần xem trước (mặc định theo quy tắc nếu người dùng chưa chọn) */
    public record DraftPreview(CollectionPeriod period, LocalDate dueDate, IssueResult result) {
    }

    public record PublishResult(CollectionPeriod period, IssueResult result) {
    }

    /**
     * Xem trước các khoản sẽ lập khi mở kỳ. Kỳ dự thảo lấy lại biểu giá hiệu lực tại ngày đầu kỳ (biểu giá có thể
     * vừa được ban hành sau lúc hệ thống tạo dự thảo), nên số tiền xem trước khớp với lúc mở kỳ.
     */
    public DraftPreview preview(Long periodId, LocalDate openDate, LocalDate companyDueDate, LocalDate householdDueDate,
            CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        CollectionPeriod period = periods.findByIdWithTariff(periodId).orElseThrow(PeriodPublishService::notFound);
        requireDraft(period);
        refreshTariff(period);
        schedule(period, openDate, companyDueDate);
        LocalDate due = dueDate(period, householdDueDate);
        return new DraftPreview(period, due, chargeRequests.previewDraft(command(period, due, null), actor));
    }

    public PublishResult publish(Long periodId, LocalDate openDate, LocalDate companyDueDate, LocalDate householdDueDate,
            String note, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        // Khóa dòng kỳ: hai cán bộ cùng bấm thì người sau thấy kỳ đã mở.
        CollectionPeriod period = periods.findByIdForUpdate(periodId).orElseThrow(PeriodPublishService::notFound);
        requireDraft(period);
        TariffVersion tariff = refreshTariff(period);
        schedule(period, openDate, companyDueDate);
        LocalDate due = dueDate(period, householdDueDate);
        IssueCommand cmd = command(period, due, note);

        period.publish();
        // Đẩy trạng thái COLLECTING xuống CSDL trước khi phát hành: PeriodGuard đọc lại trạng thái bằng FOR SHARE.
        periods.saveAndFlush(period);
        IssueResult result = chargeRequests.publish(cmd, actor);

        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", period.getStatus());
        after.put("tariffVersion", tariff.getCode());
        after.put("openDate", period.getOpenDate());
        after.put("companyDueDate", period.getDueDate());
        after.put("dueDate", due);
        after.put("requestCode", result.requestCode());
        after.put("chargeCount", result.chargeCount());
        after.put("totalAmount", result.totalAmount());
        audit.record(actor, "PUBLISH_PERIOD", ENTITY, period.getCode(), Map.of("status", PeriodStatus.DRAFT), after);
        return new PublishResult(period, result);
    }

    /** Cán bộ xã đặt ngày mở / hạn công ty nộp xã (trống thì giữ giá trị của dự thảo). */
    private static void schedule(CollectionPeriod period, LocalDate openDate, LocalDate companyDueDate) {
        if (openDate != null || companyDueDate != null) {
            period.schedule(openDate != null ? openDate : period.getOpenDate(),
                    companyDueDate != null ? companyDueDate : period.getDueDate());
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

    /** Hạn hộ đóng: người dùng chọn, hoặc ngày mở (hoặc hôm nay nếu muộn hơn) cộng số ngày theo quy tắc, không quá hạn nộp xã. */
    private LocalDate dueDate(CollectionPeriod period, LocalDate requested) {
        if (requested != null) {
            if (requested.isBefore(period.getOpenDate()) || requested.isAfter(period.getDueDate())) {
                throw new BusinessRuleException("HOUSEHOLD_DUE_OUT_OF_RANGE",
                        "Hạn hộ đóng phải nằm giữa ngày mở kỳ và hạn công ty nộp xã.");
            }
            return requested;
        }
        LocalDate from = LocalDate.now(clock);
        if (period.getOpenDate().isAfter(from)) {
            from = period.getOpenDate();
        }
        LocalDate byRule = from.plusDays(auto.currentRule().getHouseholdDueDays());
        return byRule.isAfter(period.getDueDate()) ? period.getDueDate() : byRule;
    }

    private IssueCommand command(CollectionPeriod period, LocalDate due, String note) {
        FeeType env = feeTypes.findByCode(ENV_FEE_CODE).orElseThrow(() -> new NotFoundException("FEE_TYPE_NOT_FOUND",
                "Chưa có loại phí vệ sinh môi trường (" + ENV_FEE_CODE + ") để lập khoản."));
        return new IssueCommand(period.getId(), env.getId(), ChargeScope.ALL, null, null, due, null, note);
    }

    private static NotFoundException notFound() {
        return new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu.");
    }
}
