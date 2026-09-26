package vn.dongthanh.vsmt.platform.common;

/**
 * Không tìm thấy, hoặc nằm ngoài phạm vi dữ liệu của người gọi, trả 404.
 */
public class NotFoundException extends BusinessRuleException {

    public NotFoundException(String code, String message) {
        super(code, message);
    }
}
