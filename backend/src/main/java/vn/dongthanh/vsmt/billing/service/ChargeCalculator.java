package vn.dongthanh.vsmt.billing.service;

import org.springframework.stereotype.Component;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Quy tắc R1, tính số tiền một khoản (không đụng CSDL):
 * <ul>
 * <li>Phí theo biểu giá: đơn giá tháng của nhóm giá (theo biểu giá gắn với kỳ) × (kỳ quý ? 3 : 1).</li>
 * <li>Phí giá cố định: giá nhập, không nhập thì giá mặc định; luôn 1 tháng.</li>
 * <li>Hợp đồng miễn 100%: số tiền 0 (vẫn chụp đơn giá).</li>
 * </ul>
 * Tiền là số nguyên VND; tràn số báo lỗi thay vì quay vòng.
 */
@Component
public class ChargeCalculator {

    public record ChargeAmount(TariffGroup tariffGroup, long unitPrice, int months, long amount, boolean exempt) {
    }

    public ChargeAmount calculate(FeeType feeType, CollectionPeriod period, ServiceContract contract, Long enteredPrice) {
        TariffGroup group = null;
        long unitPrice;
        int months;
        if (feeType.getPricingMode() == PricingMode.TARIFF) {
            group = contract.getTariffGroup();
            TariffGroup g = group;
            unitPrice = period.getTariffVersion().rateFor(g)
                    .orElseThrow(() -> new BusinessRuleException("TARIFF_RATE_NOT_FOUND", "Biểu giá "
                            + period.getTariffVersion().getCode() + " của kỳ " + period.getCode()
                            + " chưa có đơn giá cho nhóm " + g + "."))
                    .getMonthlyTotal();
            months = period.getPeriodType() == PeriodType.QUARTER ? 3 : 1;
        } else {
            if (enteredPrice != null && enteredPrice < 0) {
                throw new BusinessRuleException("CHARGE_PRICE_INVALID", "Đơn giá không được âm.");
            }
            unitPrice = enteredPrice != null ? enteredPrice : feeType.getDefaultPrice();
            months = 1;
        }
        boolean exempt = contract.isExempt();
        long amount = exempt ? 0L : Math.multiplyExact(unitPrice, (long) months);
        return new ChargeAmount(group, unitPrice, months, amount, exempt);
    }
}
