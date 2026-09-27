package vn.dongthanh.vsmt.platform.security;

import java.util.List;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/** Authentication của token người dân: principal là {@link CurrentCitizen}, quyền duy nhất {@code ROLE_CITIZEN}. */
public class CurrentCitizenAuthentication extends AbstractAuthenticationToken {

    static final String AUTHORITY = "ROLE_" + CurrentCitizen.KIND_CITIZEN;

    private final CurrentCitizen citizen;
    private final Jwt token;

    public CurrentCitizenAuthentication(CurrentCitizen citizen, Jwt token) {
        super(List.of(new SimpleGrantedAuthority(AUTHORITY)));
        this.citizen = citizen;
        this.token = token;
        setAuthenticated(true);
    }

    @Override
    public CurrentCitizen getPrincipal() {
        return citizen;
    }

    @Override
    public Jwt getCredentials() {
        return token;
    }

    @Override
    public String getName() {
        return "citizen:" + citizen.accountId();
    }
}
