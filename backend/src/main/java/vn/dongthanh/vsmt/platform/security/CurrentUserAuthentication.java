package vn.dongthanh.vsmt.platform.security;

import java.util.List;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Authentication sau khi giải mã token: principal là {@link CurrentUser}, quyền là {@code ROLE_<vai trò>}.
 * Controller lấy bằng {@code @AuthenticationPrincipal CurrentUser actor}.
 */
public class CurrentUserAuthentication extends AbstractAuthenticationToken {

    private final CurrentUser user;
    private final Jwt token;

    public CurrentUserAuthentication(CurrentUser user, Jwt token) {
        super(List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name())));
        this.user = user;
        this.token = token;
        setAuthenticated(true);
    }

    static CurrentUserAuthentication from(Jwt jwt) {
        return new CurrentUserAuthentication(CurrentUser.fromJwt(jwt), jwt);
    }

    @Override
    public CurrentUser getPrincipal() {
        return user;
    }

    @Override
    public Jwt getCredentials() {
        return token;
    }

    @Override
    public String getName() {
        return user.username();
    }
}
