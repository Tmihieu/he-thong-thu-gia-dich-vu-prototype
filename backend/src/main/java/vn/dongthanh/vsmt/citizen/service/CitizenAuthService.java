package vn.dongthanh.vsmt.citizen.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Optional;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.UnauthorizedException;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.platform.security.JwtService.IssuedToken;

/**
 * Đăng nhập app người dân bằng SĐT + OTP cố định mô phỏng (O7): "gửi OTP" không gửi SMS, "xác nhận"
 * so với mã trong cấu hình. SĐT chưa có tài khoản và OTP sai trả cùng một lỗi để không lộ SĐT nào đã đăng ký.
 */
@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(CitizenProperties.class)
public class CitizenAuthService {

    public static final int OTP_TTL_SECONDS = 300;

    private final CitizenAccountRepository accounts;
    private final CitizenProperties props;
    private final JwtService jwt;
    private final Clock clock;

    public String requestOtp(String rawPhone) {
        return normalize(rawPhone);
    }

    @Transactional
    public LoginResult verifyOtp(String rawPhone, String otp) {
        String phone = normalize(rawPhone);
        Optional<CitizenAccount> found = accounts.findByPhone(phone);
        boolean otpMatches = MessageDigest.isEqual(props.demoOtp().getBytes(StandardCharsets.UTF_8),
                (otp == null ? "" : otp.trim()).getBytes(StandardCharsets.UTF_8));
        if (found.isEmpty() || !otpMatches) {
            throw new UnauthorizedException("INVALID_OTP", "Số điện thoại hoặc mã OTP không đúng.");
        }
        CitizenAccount account = found.get();
        if (!account.isActive()) {
            throw accountLocked();
        }
        account.recordLogin(OffsetDateTime.now(clock));
        return new LoginResult(account, jwt.issueCitizen(account.getId(), account.getSubject().getId()));
    }

    static UnauthorizedException accountLocked() {
        return new UnauthorizedException("ACCOUNT_LOCKED", "Tài khoản đã bị khóa. Vui lòng liên hệ UBND xã.");
    }

    private static String normalize(String rawPhone) {
        return PhoneNumbers.normalize(rawPhone).orElseThrow(() -> new BusinessRuleException("INVALID_PHONE",
                "Số điện thoại không hợp lệ. Nhập 10 hoặc 11 chữ số, bắt đầu bằng 0 hoặc +84."));
    }

    public record LoginResult(CitizenAccount account, IssuedToken token) {
    }
}
