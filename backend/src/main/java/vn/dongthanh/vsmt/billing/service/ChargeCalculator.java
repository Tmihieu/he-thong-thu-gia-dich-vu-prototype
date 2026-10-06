package vn.dongthanh.vsmt.billing.service;

import org.springframework.stereotype.Component;

import vn.dongthanh.vsmt.billing.domain.ChargeAmount;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Quy tắc R1, tính số tiền một khoản (không đụng CSDL):
 * <ul>
 * <li>Phí theo biểu giá: đơn giá tháng của nhóm giá (theo biểu giá gắn với kỳ) × (kỳ quý ? 3 : 1).</li>
 * <li>Hộ gia đình ở địa bàn mà biểu giá của kỳ bật theo nhân khẩu, hoặc đăng ký nhóm theo nhân khẩu: đơn giá một người
 * × số nhân khẩu hiện tại của hộ × số tháng (họp công ty 05/10).</li>
 * <li>Phí giá cố định: giá nhập (phải &gt; 0), không nhập thì giá mặc định; luôn 1 tháng.</li>
 * <li>Nhóm theo ký (BY_VOLUME, FULL_COST_BY_KG): đơn giá đ/kg × định mức kg/tháng của hợp đồng × số tháng; chưa có định
 * mức thì từ chối.</li>
 * <li>Hợp đồng miễn 100%: số tiền 0 (vẫn chụp đơn giá).</li>
 * </ul>
 * Tiền là số nguyên VND; tràn số báo lỗi thay vì quay vòng.
 */
@Component
public class ChargeCalculator {

    public ChargeAmount calculate(FeeType feeType, CollectionPeriod period, ServiceContract contract, Long enteredPrice) {
        TariffGroup group = null;
        long unitPrice;
        int months;
        long quantity = 1;
        Long snapshotKg = null;
        Integer snapshotMembers = null;
        if (feeType.getPricingMode() == PricingMode.TARIFF) {
            TariffVersion tariff = period.getTariffVersion();
            ServiceSubject subject = contract.getSubject();
            group = contract.getTariffGroup();
            if (group.isHousehold() && tariff.perCapitaIn(subject.getArea().getDistrict())) {
                group = TariffGroup.HH_PER_CAPITA;
            }
            TariffGroup g = group;
            unitPrice = tariff.rateFor(g)
                    .orElseThrow(() -> new BusinessRuleException("TARIFF_RATE_NOT_FOUND", "Biểu giá "
                            + tariff.getCode() + " của kỳ " + period.getCode()
                            + " chưa có đơn giá cho nhóm " + g + "."))
                    .getMonthlyTotal();
            months = period.getPeriodType() == PeriodType.QUARTER ? 3 : 1;
            if (group.isPerKg()) {
                // Nhóm theo ký: đơn giá đ/kg × định mức kg/tháng (cán bộ xã cân một lần); chưa có định mức thì chưa lập được.
                if (contract.getQuotaKg() == null && !contract.isExempt()) {
                    throw new BusinessRuleException("QUOTA_KG_REQUIRED", "Đăng ký thu phí nhóm tính theo ký chưa có định mức kg/tháng.");
                }
                // quota null chỉ khi miễn 100% (amount = 0)
                snapshotKg = contract.getQuotaKg() == null ? null : contract.getQuotaKg().longValue();
                quantity = snapshotKg == null ? 1 : snapshotKg;
            } else if (group == TariffGroup.HH_PER_CAPITA) {
                // Lấy số nhân khẩu lúc lập khoản: đổi số người thì khoản chưa lập tính ngay theo số mới.
                snapshotMembers = subject.getMemberCount();
                if (snapshotMembers == null) {
                    throw new BusinessRuleException("MEMBER_COUNT_REQUIRED", "Hộ gia đình chưa có số nhân khẩu.");
                }
                quantity = snapshotMembers;
            }
        } else {
            if (enteredPrice != null && enteredPrice <= 0) {
                throw new BusinessRuleException("CHARGE_PRICE_INVALID", "Đơn giá phải lớn hơn 0.");
            }
            unitPrice = enteredPrice != null ? enteredPrice : feeType.getDefaultPrice();
            months = 1;
        }
        boolean exempt = contract.isExempt();
        long amount = exempt ? 0L : Math.multiplyExact(Math.multiplyExact(unitPrice, quantity), (long) months);
        return new ChargeAmount(group, unitPrice, months, amount, exempt, snapshotKg, snapshotMembers);
    }
}
