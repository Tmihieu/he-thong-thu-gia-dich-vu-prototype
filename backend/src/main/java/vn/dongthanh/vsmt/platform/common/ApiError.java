package vn.dongthanh.vsmt.platform.common;

/**
 * Thân JSON của mọi phản hồi lỗi: {@code code} cho máy đọc, {@code message} tiếng Việt cho người dùng.
 */
public record ApiError(String code, String message) {
}
