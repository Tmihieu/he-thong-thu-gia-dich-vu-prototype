package vn.dongthanh.vsmt.platform.security;

import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.domain.User;

/**
 * Phát access token HS256. Token nội bộ có claim {@code sub} (id user), {@code username}, {@code role},
 * {@code companyId}; token người dân có {@code kind = CITIZEN}, {@code sub} (id tài khoản), {@code subjectId}.
 */
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder encoder;
    private final JwtProperties props;

    public IssuedToken issue(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(props.accessTokenTtl());
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(props.issuer())
                .subject(String.valueOf(user.getId()))
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim(CurrentUser.CLAIM_USERNAME, user.getUsername())
                .claim(CurrentUser.CLAIM_ROLE, user.getRole().name());
        if (user.getCompanyId() != null) {
            claims.claim(CurrentUser.CLAIM_COMPANY_ID, user.getCompanyId());
        }
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }

    public IssuedToken issueCitizen(Long accountId, Long subjectId) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(props.citizenTokenTtl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(props.issuer())
                .subject(String.valueOf(accountId))
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim(CurrentCitizen.CLAIM_KIND, CurrentCitizen.KIND_CITIZEN)
                .claim(CurrentCitizen.CLAIM_SUBJECT_ID, subjectId)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }

    public record IssuedToken(String value, Instant expiresAt) {
    }
}
