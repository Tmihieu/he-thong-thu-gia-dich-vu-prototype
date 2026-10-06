package vn.dongthanh.vsmt.platform.service;

/**
 * Quản trị sắp đổi vai trò hoặc công ty của một tài khoản (T51). Phát trong cùng transaction, trước khi lưu;
 * module khác còn dữ liệu gắn với vai trò cũ (vd. tiền mặt người đi thu chưa bàn giao) thì ném lỗi nghiệp vụ để chặn.
 */
public record UserReassignedEvent(Long userId, String username, boolean wasCollector) {
}
