package vn.dongthanh.vsmt.jmixadmin.security;

import io.jmix.security.authentication.JmixUserDetails;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;
import java.util.List;

/** Tài khoản ADMIN của backend (bảng users), dùng chung mật khẩu với web. */
public class AdminUser implements JmixUserDetails {

    private final Long id;
    private final String username;
    private final String fullName;
    private final String passwordHash;
    private final boolean enabled;
    private Collection<? extends GrantedAuthority> authorities = List.of();

    public AdminUser(Long id, String username, String fullName, String passwordHash, boolean enabled) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.passwordHash = passwordHash;
        this.enabled = enabled;
    }

    public Long getId() { return id; }
    public String getFullName() { return fullName; }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public void setAuthorities(Collection<? extends GrantedAuthority> authorities) { this.authorities = authorities; }
    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return username; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return enabled; }
}
