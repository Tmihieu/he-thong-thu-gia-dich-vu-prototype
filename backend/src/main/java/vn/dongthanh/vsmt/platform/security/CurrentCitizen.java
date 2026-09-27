package vn.dongthanh.vsmt.platform.security;

import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Người dân đang gọi API app, dựng từ token người dân ({@code kind = CITIZEN}). Phạm vi dữ liệu là
 * hộ {@code subjectId} gắn với tài khoản; controller lấy bằng {@code @AuthenticationPrincipal CurrentCitizen}.
 */
public record CurrentCitizen(Long accountId, Long subjectId) {

    static final String KIND_CITIZEN = "CITIZEN";
    static final String CLAIM_KIND = "kind";
    static final String CLAIM_SUBJECT_ID = "subjectId";

    static boolean isCitizenToken(Jwt jwt) {
        return KIND_CITIZEN.equals(jwt.getClaimAsString(CLAIM_KIND));
    }

    static CurrentCitizen fromJwt(Jwt jwt) {
        return new CurrentCitizen(Long.valueOf(jwt.getSubject()),
                ((Number) jwt.getClaims().get(CLAIM_SUBJECT_ID)).longValue());
    }
}
