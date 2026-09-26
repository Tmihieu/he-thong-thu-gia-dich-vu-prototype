package vn.dongthanh.vsmt.platform.common;

/**
 * Xung đột với trạng thái hiện có (trùng, đã bị người khác sửa), trả 409.
 */
public class ConflictException extends BusinessRuleException {

    public ConflictException(String code, String message) {
        super(code, message);
    }
}
