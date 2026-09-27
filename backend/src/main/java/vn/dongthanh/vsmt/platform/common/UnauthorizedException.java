package vn.dongthanh.vsmt.platform.common;

/**
 * Không xác thực được người gọi (vd. OTP sai, tài khoản người dân bị khóa), trả 401 kèm mã riêng.
 */
public class UnauthorizedException extends BusinessRuleException {

    public UnauthorizedException(String code, String message) {
        super(code, message);
    }
}
