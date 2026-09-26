package vn.dongthanh.vsmt.platform.common;

import lombok.Getter;

/**
 * Vi phạm quy tắc nghiệp vụ, trả 422. {@code message} là tiếng Việt, hiển thị thẳng cho người dùng.
 */
@Getter
public class BusinessRuleException extends RuntimeException {

    private final String code;

    public BusinessRuleException(String code, String message) {
        super(message);
        this.code = code;
    }
}
