package vn.dongthanh.vsmt.platform.service;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.domain.UserStatus;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Quản trị tài khoản web (T51): chỉ ADMIN; mọi thao tác ghi nhật ký, không bao giờ ghi mật khẩu.
 * Quản trị không tự khóa hay tự đổi vai trò của mình để khỏi mất quyền vào hệ thống.
 * ponytail: khóa/đổi vai trò chỉ chặn từ lần đăng nhập sau; token đang dùng còn hiệu lực tới hết hạn (8 giờ).
 * Cần chặn ngay thì kiểm trạng thái tài khoản mỗi request.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserAdminService {

    static final String ENTITY = "User";

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AuditService audit;
    private final ApplicationEventPublisher events;

    public record UserCommand(String fullName, Role role, Long companyId, String phone, String email,
            String organization) {
    }

    @Transactional(readOnly = true)
    public List<User> list(CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        return users.findAll(Sort.by("username"));
    }

    public User create(String username, String password, UserCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        String normalized = username.trim().toLowerCase(Locale.ROOT);
        if (users.existsByUsername(normalized)) {
            throw new ConflictException("USERNAME_TAKEN", "Tên đăng nhập " + normalized + " đã có.");
        }
        User user = User.create(normalized, cmd.fullName().trim(), cmd.role(), requireCompany(cmd),
                encode(password));
        apply(user, cmd);
        User saved = users.save(user);
        audit.record(actor, "CREATE_USER", ENTITY, saved.getUsername(), null, snapshot(saved));
        return saved;
    }

    public User update(Long id, UserCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        User user = find(id);
        if (isSelf(user, actor) && cmd.role() != user.getRole()) {
            throw new BusinessRuleException("CANNOT_CHANGE_OWN_ROLE", "Không tự đổi vai trò của tài khoản đang đăng nhập.");
        }
        Long companyId = requireCompany(cmd);
        if (cmd.role() != user.getRole() || !Objects.equals(companyId, user.getCompanyId())) {
            events.publishEvent(new UserReassignedEvent(user.getId(), user.getUsername(), user.getRole() == Role.COLLECTOR));
        }
        Map<String, Object> before = snapshot(user);
        user.setFullName(cmd.fullName().trim());
        user.assignRole(cmd.role(), companyId);
        apply(user, cmd);
        audit.record(actor, "UPDATE_USER", ENTITY, user.getUsername(), before, snapshot(user));
        return user;
    }

    public User setStatus(Long id, UserStatus status, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        User user = find(id);
        if (isSelf(user, actor) && status == UserStatus.LOCKED) {
            throw new BusinessRuleException("CANNOT_LOCK_SELF", "Không tự khóa tài khoản đang đăng nhập.");
        }
        Map<String, Object> before = snapshot(user);
        user.setStatus(status);
        audit.record(actor, status == UserStatus.LOCKED ? "LOCK_USER" : "UNLOCK_USER", ENTITY, user.getUsername(),
                before, snapshot(user));
        return user;
    }

    public User resetPassword(Long id, String password, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        User user = find(id);
        user.setPasswordHash(encode(password));
        audit.record(actor, "RESET_PASSWORD", ENTITY, user.getUsername(), null, null);
        return user;
    }

    /** bcrypt chỉ nhận 72 byte; chữ có dấu chiếm 2–3 byte nên @Size(max = 72) ký tự chưa đủ chặn. */
    private String encode(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BusinessRuleException("PASSWORD_TOO_LONG", "Mật khẩu quá dài (chữ có dấu tính 2–3 ký tự); hãy rút ngắn.");
        }
        return passwords.encode(password);
    }

    private static Long requireCompany(UserCommand cmd) {
        if (cmd.role().belongsToCompany() && cmd.companyId() == null) {
            throw new BusinessRuleException("USER_COMPANY_REQUIRED", "Vai trò công ty và người đi thu phải chọn công ty.");
        }
        return cmd.role().belongsToCompany() ? cmd.companyId() : null;
    }

    private static void apply(User user, UserCommand cmd) {
        user.setPhone(blankToNull(cmd.phone()));
        user.setEmail(blankToNull(cmd.email()));
        user.setOrganization(blankToNull(cmd.organization()));
    }

    private static boolean isSelf(User user, CurrentUser actor) {
        return Objects.equals(user.getId(), actor.id());
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "Không tìm thấy tài khoản."));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static Map<String, Object> snapshot(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("username", u.getUsername());
        m.put("fullName", u.getFullName());
        m.put("role", u.getRole());
        m.put("companyId", u.getCompanyId());
        m.put("phone", u.getPhone());
        m.put("email", u.getEmail());
        m.put("organization", u.getOrganization());
        m.put("status", u.getStatus());
        return m;
    }
}
