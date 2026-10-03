package vn.dongthanh.vsmt.jmixadmin.security;

import io.jmix.core.security.UserRepository;
import io.jmix.security.role.RoleGrantedAuthorityUtils;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;

/**
 * Đăng nhập Jmix bằng đúng tài khoản ADMIN trong bảng users của backend (bcrypt, cùng mật khẩu với web).
 * Chỉ role ADMIN vào được; tài khoản LOCKED bị chặn.
 */
@Primary
@Component("vsmt_AdminUserRepository")
public class AdminUserRepository implements UserRepository {

    private static final String SELECT =
            "select id, username, full_name, password_hash, status from users where role = 'ADMIN' and ";

    private final JdbcTemplate jdbc;
    private final RoleGrantedAuthorityUtils authorityUtils;

    public AdminUserRepository(DataSource dataSource, RoleGrantedAuthorityUtils authorityUtils) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.authorityUtils = authorityUtils;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        List<AdminUser> users = query(SELECT + "username = ?", username);
        if (users.isEmpty()) {
            throw new UsernameNotFoundException("Không có tài khoản ADMIN: " + username);
        }
        return users.get(0);
    }

    @Override
    public UserDetails getSystemUser() {
        AdminUser system = new AdminUser(0L, "system", "System", "{noop}", true);
        system.setAuthorities(List.of(authorityUtils.createResourceRoleGrantedAuthority(FullAccessRole.CODE)));
        return system;
    }

    @Override
    public UserDetails getAnonymousUser() {
        return new AdminUser(-1L, "anonymous", "Anonymous", "{noop}", false);
    }

    @Override
    public List<? extends UserDetails> getByUsernameLike(String substring) {
        return query(SELECT + "username like ?", "%" + substring + "%");
    }

    private List<AdminUser> query(String sql, String arg) {
        return jdbc.query(sql, (rs, i) -> {
            AdminUser u = new AdminUser(rs.getLong("id"), rs.getString("username"), rs.getString("full_name"),
                    "{bcrypt}" + rs.getString("password_hash"), "ACTIVE".equals(rs.getString("status")));
            u.setAuthorities(List.of(authorityUtils.createResourceRoleGrantedAuthority(FullAccessRole.CODE)));
            return u;
        }, arg);
    }
}
