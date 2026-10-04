package vn.dongthanh.vsmt.complaint.domain;

/**
 * Thu gom chậm hoặc không đúng lịch / Thu phí cao hơn định mức / Điểm tập kết gây ô nhiễm / Thái độ nhân viên thu gom /
 * Cơ sở vật chất / Đề nghị thu gom / Đã đóng nhưng chưa được ghi nhận / Vấn đề khác.
 */
public enum ComplaintCategory {
    LATE_COLLECTION,
    OVERCHARGE,
    POLLUTION_POINT,
    STAFF_ATTITUDE,
    FACILITY,
    COLLECTION_REQUEST,
    PAID_NOT_RECORDED,
    OTHER
}
