package vn.dongthanh.vsmt.complaint.domain;

/** Mới → Đang xử lý → Đã giải quyết. "Quá hạn xử lý" không lưu, tính từ hạn. */
public enum ComplaintStatus {
    NEW,
    PROCESSING,
    RESOLVED
}
