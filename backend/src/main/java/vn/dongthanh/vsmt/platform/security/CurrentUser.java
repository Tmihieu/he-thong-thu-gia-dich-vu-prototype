package vn.dongthanh.vsmt.platform.security;

import java.util.Arrays;
import java.util.Objects;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;

import vn.dongthanh.vsmt.platform.domain.Role;

/**
 * Người đang gọi API, dựng từ access token. Service nhận tham số này để kiểm tra vai trò
 * và phạm vi dữ liệu; không lấy danh tính từ tham số client gửi lên.
 */
public record CurrentUser(Long id, String username, Role role, Long companyId) {

    static final String CLAIM_USERNAME = "username";
    static final String CLAIM_ROLE = "role";
    static final String CLAIM_COMPANY_ID = "companyId";

    public static CurrentUser fromJwt(Jwt jwt) {
        Object company = jwt.getClaims().get(CLAIM_COMPANY_ID);
        return new CurrentUser(
                Long.valueOf(jwt.getSubject()),
                jwt.getClaimAsString(CLAIM_USERNAME),
                Role.valueOf(jwt.getClaimAsString(CLAIM_ROLE)),
                company == null ? null : ((Number) company).longValue());
    }

    public boolean hasRole(Role... allowed) {
        return Arrays.asList(allowed).contains(role);
    }

    /** Chặn 403 nếu vai trò không nằm trong danh sách được phép. */
    public void requireRole(Role... allowed) {
        if (!hasRole(allowed)) {
            throw new AccessDeniedException("Vai trò " + role + " không được phép");
        }
    }

    /**
     * Chặn 403 nếu người gọi thuộc một công ty và dữ liệu thuộc công ty khác.
     * Cán bộ xã và quản trị xem được mọi công ty.
     */
    public void requireCompany(Long dataCompanyId) {
        if (role.belongsToCompany() && !Objects.equals(companyId, dataCompanyId)) {
            throw new AccessDeniedException("Không thuộc phạm vi công ty " + companyId);
        }
    }
}
