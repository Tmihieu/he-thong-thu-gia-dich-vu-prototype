package vn.dongthanh.vsmt.billing.service;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeAdjustment;
import vn.dongthanh.vsmt.billing.domain.ChargeAdjustmentRepository;
import vn.dongthanh.vsmt.billing.domain.ChargeRepository;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.domain.PaymentRepository;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.service.PeriodGuard;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Cán bộ xã sửa khoản phải thu lập sai phí: điều chỉnh theo biểu giá của kỳ hoặc hủy khoản, luôn kèm lý do. Chỉ khoản chưa có lần
 * thu nào (kể cả đã hoàn) và kỳ chưa khóa; khoản đã thu phải hoàn trước (T58). Mỗi lần sửa lưu một dòng lịch sử.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ChargeCorrectionService {

    static final String ENTITY = "Charge";

    private final ChargeRepository charges;
    private final ChargeAdjustmentRepository adjustments;
    private final PaymentRepository payments;
    private final PeriodGuard periodGuard;
    private final AuditService audit;
    private final Clock clock;

    /** Đơn giá tháng của một nhóm trong biểu giá của kỳ (lựa chọn khi điều chỉnh). */
    public record Rate(TariffGroup group, long monthlyTotal, String unitLabel) {
    }

    /** Chi tiết khoản: các lần thu / hoàn, lịch sử điều chỉnh, hủy và biểu giá của kỳ (null với phí giá cố định). */
    public record Detail(Charge charge, List<Payment> payments, List<ChargeAdjustment> adjustments, String tariffCode,
            List<Rate> rates) {
    }

    @Transactional(readOnly = true)
    public Detail detail(Long chargeId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN, Role.COMPANY_MANAGER, Role.LEADER);
        Charge charge = charges.findByIdWithDetails(chargeId)
                .filter(c -> !actor.role().belongsToCompany() || Objects.equals(c.getCompany().getId(), actor.companyId()))
                .orElseThrow(ChargeCorrectionService::notFound);
        TariffVersion tariff = charge.getTariffGroup() == null ? null : charge.getPeriod().getTariffVersion();
        List<Rate> rates = tariff == null ? List.of() : tariff.getRates().stream()
                .map(r -> new Rate(r.getTariffGroup(), r.getMonthlyTotal(), r.getUnitLabel()))
                .sorted(Comparator.comparing(r -> r.group().ordinal())).toList();
        return new Detail(charge, payments.findByChargeIdOrderByPaidAtAsc(chargeId),
                adjustments.findByChargeIdOrderByCreatedAtDescIdDesc(chargeId),
                tariff == null ? null : tariff.getCode(), rates);
    }

    /**
     * Điều chỉnh theo biểu giá của kỳ: chọn lại nhóm giá (và nhân khẩu / định mức kg nếu nhóm cần), đơn giá lấy từ biểu
     * giá, số tiền tính lại. Chỉ sửa khoản này; đăng ký thu phí của hộ sửa riêng ở hồ sơ hộ.
     */
    public Charge adjust(Long chargeId, TariffGroup group, Integer memberCount, Long quotaKg, String reason,
            CurrentUser actor) {
        Charge charge = loadCorrectable(chargeId, reason, actor);
        TariffVersion tariff = charge.getPeriod().getTariffVersion();
        if (charge.getTariffGroup() == null || tariff == null) {
            throw new BusinessRuleException("CHARGE_NOT_TARIFF", "Khoản " + charge.getCode()
                    + " không tính theo biểu giá, không điều chỉnh được; hủy và lập lại nếu sai.");
        }
        long rate = tariff.rateFor(group)
                .orElseThrow(() -> new BusinessRuleException("TARIFF_RATE_NOT_FOUND",
                        "Biểu giá " + tariff.getCode() + " không có đơn giá cho nhóm đã chọn."))
                .getMonthlyTotal();
        long oldAmount = charge.getAmount();
        TariffGroup oldGroup = charge.getTariffGroup();
        Long oldQty = quantityOf(charge);
        Map<String, Object> before = new LinkedHashMap<>();
        before.put("amount", oldAmount);
        before.put("tariffGroup", oldGroup);
        before.put("quantity", oldQty);
        charge.reprice(group, rate, memberCount, quotaKg);
        adjustments.save(ChargeAdjustment.of(charge, ChargeAdjustment.Type.ADJUST, oldAmount, charge.getAmount(),
                reason.trim(), actor.id()).withTariff(oldGroup, oldQty, group, quantityOf(charge)));
        Map<String, Object> after = track(charge, reason);
        after.put("tariffGroup", group);
        after.put("quantity", quantityOf(charge));
        audit.record(actor, "ADJUST_CHARGE", ENTITY, charge.getCode(), before, after);
        return charge;
    }

    private static Long quantityOf(Charge c) {
        if (c.getQuotaKg() != null) {
            return c.getQuotaKg();
        }
        return c.getMemberCount() == null ? null : c.getMemberCount().longValue();
    }

    public Charge cancel(Long chargeId, String reason, CurrentUser actor) {
        Charge charge = loadCorrectable(chargeId, reason, actor);
        String oldStatus = charge.getStatus().name();
        charge.cancel(reason.trim(), OffsetDateTime.now(clock));
        adjustments.save(ChargeAdjustment.of(charge, ChargeAdjustment.Type.CANCEL, charge.getAmount(), 0,
                reason.trim(), actor.id()));
        audit.record(actor, "CANCEL_CHARGE", ENTITY, charge.getCode(), Map.of("status", oldStatus),
                track(charge, reason));
        return charge;
    }

    private Charge loadCorrectable(Long chargeId, String reason, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN);
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleException("REASON_REQUIRED", "Phải ghi lý do.");
        }
        // Khóa dòng khoản trước khi đọc: chặn ghi thu / chuyển khoản chạy song song với lúc sửa.
        charges.lockById(chargeId).orElseThrow(ChargeCorrectionService::notFound);
        Charge charge = charges.findByIdWithDetails(chargeId).orElseThrow(ChargeCorrectionService::notFound);
        periodGuard.requireOpen(charge.getPeriod());
        if (!charge.isCorrectable()) {
            throw new BusinessRuleException("CHARGE_NOT_CORRECTABLE",
                    "Chỉ điều chỉnh hoặc hủy khoản chưa thu hoặc miễn giảm (" + charge.getCode() + ").");
        }
        if (!payments.findByChargeIdOrderByPaidAtAsc(chargeId).isEmpty()) {
            throw new BusinessRuleException("CHARGE_HAS_PAYMENTS",
                    "Khoản " + charge.getCode() + " đã có lần thu, không điều chỉnh hoặc hủy được.");
        }
        return charge;
    }

    private static Map<String, Object> track(Charge charge, String reason) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", charge.getStatus());
        m.put("amount", charge.getAmount());
        m.put("reason", reason.trim());
        return m;
    }

    private static NotFoundException notFound() {
        return new NotFoundException("CHARGE_NOT_FOUND", "Không tìm thấy khoản thu.");
    }
}
