package vn.dongthanh.vsmt.platform.service;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.platform.security.JwtService.IssuedToken;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtService jwt;
    // So khớp với mã băm giả khi không có tài khoản, để thời gian phản hồi không lộ username tồn tại.
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwords, JwtService jwt) {
        this.users = users;
        this.passwords = passwords;
        this.jwt = jwt;
        this.dummyHash = passwords.encode("khong-phai-mat-khau-that");
    }

    @Transactional
    public LoginResult login(String username, String password) {
        String normalized = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        Optional<User> found = users.findByUsername(normalized);
        boolean matches = passwords.matches(password, found.map(User::getPasswordHash).orElse(dummyHash));
        if (found.isEmpty() || !matches) {
            throw new BadCredentialsException("Sai tên đăng nhập hoặc mật khẩu");
        }
        User user = found.get();
        if (!user.isActive()) {
            throw new LockedException("Tài khoản đã khóa");
        }
        user.setLastLoginAt(OffsetDateTime.now());
        return new LoginResult(user, jwt.issue(user));
    }

    @Transactional(readOnly = true)
    public User me(CurrentUser actor) {
        return users.findById(actor.id())
                .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "Không tìm thấy tài khoản đang đăng nhập."));
    }

    public record LoginResult(User user, IssuedToken token) {
    }
}
