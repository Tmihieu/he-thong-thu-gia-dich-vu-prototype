package vn.dongthanh.vsmt.platform.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;

import vn.dongthanh.vsmt.platform.domain.Role;

class CurrentUserTest {

    final CurrentUser commune = new CurrentUser(1L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    final CurrentUser dv01 = new CurrentUser(2L, "dv01", Role.COMPANY_MANAGER, 1L);
    final CurrentUser collector = new CurrentUser(3L, "thu01", Role.COLLECTOR, 1L);

    @Test
    void requireRoleAllowsListedRolesOnly() {
        assertThatCode(() -> commune.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN)).doesNotThrowAnyException();
        assertThatThrownBy(() -> dv01.requireRole(Role.COMMUNE_OFFICER)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void requireCompanyLimitsCompanyRolesToTheirOwnCompany() {
        assertThatCode(() -> dv01.requireCompany(1L)).doesNotThrowAnyException();
        assertThatCode(() -> collector.requireCompany(1L)).doesNotThrowAnyException();
        assertThatThrownBy(() -> dv01.requireCompany(2L)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> collector.requireCompany(null)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void communeAndAdminSeeEveryCompany() {
        assertThatCode(() -> commune.requireCompany(2L)).doesNotThrowAnyException();
        assertThatCode(() -> new CurrentUser(4L, "admin", Role.ADMIN, null).requireCompany(9L))
                .doesNotThrowAnyException();
    }

    @Test
    void buildsFromJwtClaims() {
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "HS256").subject("2")
                .claim("username", "dv01").claim("role", "COMPANY_MANAGER").claim("companyId", 1)
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();

        assertThat(CurrentUser.fromJwt(jwt)).isEqualTo(dv01);
    }

    @Test
    void jwtWithoutCompanyGivesNullCompany() {
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "HS256").subject("1")
                .claim("username", "canbo_xa").claim("role", "COMMUNE_OFFICER")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();

        assertThat(CurrentUser.fromJwt(jwt)).isEqualTo(commune);
    }
}
