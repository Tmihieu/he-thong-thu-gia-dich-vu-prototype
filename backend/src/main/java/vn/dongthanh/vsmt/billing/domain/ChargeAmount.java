package vn.dongthanh.vsmt.billing.domain;

import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;

/**
 * Kết quả tính tiền một khoản (R1): nhóm giá thực tính (null với phí giá cố định), đơn giá tháng, số tháng, số tiền, miễn.
 * {@code quotaKg}: định mức kg/tháng đã chụp, chỉ có với nhóm theo ký (null khi không áp dụng hoặc hộ miễn chưa có định mức).
 * {@code memberCount}: số nhân khẩu đã chụp, chỉ có với nhóm theo nhân khẩu.
 */
public record ChargeAmount(TariffGroup tariffGroup, long unitPrice, int months, long amount, boolean exempt, Long quotaKg,
        Integer memberCount) {

    public ChargeAmount(TariffGroup tariffGroup, long unitPrice, int months, long amount, boolean exempt, Long quotaKg) {
        this(tariffGroup, unitPrice, months, amount, exempt, quotaKg, null);
    }

    public ChargeAmount(TariffGroup tariffGroup, long unitPrice, int months, long amount, boolean exempt) {
        this(tariffGroup, unitPrice, months, amount, exempt, null, null);
    }
}
