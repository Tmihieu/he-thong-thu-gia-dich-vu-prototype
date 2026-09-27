package vn.dongthanh.vsmt.citizen.domain;

/** Chờ xác nhận → Đã báo phí → Đã thu gom; Hủy được từ Chờ xác nhận hoặc Đã báo phí. */
public enum BulkyStatus {
    PENDING,
    QUOTED,
    COLLECTED,
    CANCELLED
}
