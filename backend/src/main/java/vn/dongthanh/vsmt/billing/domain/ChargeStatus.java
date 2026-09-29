package vn.dongthanh.vsmt.billing.domain;

/** Chưa thu / Đã thu / Miễn giảm / Đã xóa nợ (T57). "Quá hạn" không lưu: UNPAID và hạn đóng trước hôm nay. */
public enum ChargeStatus {
    UNPAID,
    PAID,
    EXEMPT,
    WRITTEN_OFF
}
