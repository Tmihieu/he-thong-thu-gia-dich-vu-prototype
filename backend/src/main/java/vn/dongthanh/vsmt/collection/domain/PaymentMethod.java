package vn.dongthanh.vsmt.collection.domain;

/** Tiền mặt / Chuyển khoản / App người dân (mô phỏng). */
public enum PaymentMethod {
    CASH,
    TRANSFER,
    APP_SIMULATED,
    /** Hoàn tiền đã được lãnh đạo duyệt (T58): dòng âm, không gắn người đi thu. */
    REFUND
}
