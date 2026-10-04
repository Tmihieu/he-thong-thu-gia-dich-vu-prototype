package vn.dongthanh.vsmt.billing.domain;

import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;

/**
 * Kết quả tính tiền một khoản (R1): nhóm giá (null với phí giá cố định), đơn giá tháng, số tháng, số tiền, miễn, và phần
 * thu gom công ty giữ lại (0 với phí giá cố định; khoản miễn vẫn chụp phần đầy đủ phòng khi hủy miễn).
 */
public record ChargeAmount(TariffGroup tariffGroup, long unitPrice, int months, long amount, boolean exempt,
        long collectionAmount) {
}
