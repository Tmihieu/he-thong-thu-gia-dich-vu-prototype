package vn.dongthanh.vsmt.collection.domain;

/** Tiền mặt (người đi thu) / Chuyển khoản (VietQR, ngân hàng báo về). */
public enum PaymentMethod {
    CASH,
    TRANSFER,
    /** Thanh toán mô phỏng trên app người dân: đã bỏ, chỉ còn ở dữ liệu cũ. */
    APP_SIMULATED,
    /** Hoàn tiền đã được lãnh đạo duyệt (T58): dòng âm, không gắn người đi thu. */
    REFUND
}
