package vn.dongthanh.vsmt.billing.domain;

import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;

/**
 * Kết quả tính tiền một khoản (R1): nhóm giá (null với phí giá cố định), đơn giá tháng, số tháng, số tiền, miễn.
 * {@code quotaKg}: định mức kg/tháng đã chụp, chỉ có với nhóm theo ký (null khi không áp dụng hoặc hộ miễn chưa có định mức).
 */
public record ChargeAmount(TariffGroup tariffGroup, long unitPrice, int months, long amount, boolean exempt, Long quotaKg) {

    public ChargeAmount(TariffGroup tariffGroup, long unitPrice, int months, long amount, boolean exempt) {
        this(tariffGroup, unitPrice, months, amount, exempt, null);
    }
}
