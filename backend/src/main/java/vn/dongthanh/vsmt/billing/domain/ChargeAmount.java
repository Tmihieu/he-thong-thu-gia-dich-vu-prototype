package vn.dongthanh.vsmt.billing.domain;

import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;

/** Kết quả tính tiền một khoản (R1): nhóm giá (null với phí giá cố định), đơn giá tháng, số tháng, số tiền, miễn. */
public record ChargeAmount(TariffGroup tariffGroup, long unitPrice, int months, long amount, boolean exempt) {
}
