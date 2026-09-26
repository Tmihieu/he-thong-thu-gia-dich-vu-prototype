package vn.dongthanh.vsmt.complaint.domain;

/** Gửi khiếu nại / Xã tiếp nhận / Chuyển công ty / Công ty phản hồi / Đã giải quyết. */
public enum ComplaintEventType {
    SUBMITTED,
    RECEIVED,
    FORWARDED,
    COMPANY_REPLIED,
    CLOSED
}
