package vn.dongthanh.vsmt.citizen.domain;

/**
 * Trạng thái kiểm duyệt, độc lập với OPEN/CLOSED và ẩn/hiện. Chỉ PUBLISHED lên feed; bài khớp từ khóa lọc hoặc bị
 * nhiều người báo cáo chuyển PENDING_REVIEW chờ cán bộ xã; REJECTED là gỡ hẳn, chủ bài chỉ còn xem.
 */
public enum MarketModeration {
    PUBLISHED,
    PENDING_REVIEW,
    REJECTED
}
