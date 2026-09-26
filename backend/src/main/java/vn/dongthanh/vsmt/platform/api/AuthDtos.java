package vn.dongthanh.vsmt.platform.api;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "không được để trống") @Size(max = 50) String username,
            @NotBlank(message = "không được để trống") @Size(max = 100) String password) {

        @Override
        public String toString() {
            return "LoginRequest[username=" + username + ", password=***]";
        }
    }

    public record LoginResponse(
            @Schema(requiredMode = RequiredMode.REQUIRED) String accessToken,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "Bearer") String tokenType,
            @Schema(requiredMode = RequiredMode.REQUIRED) Instant expiresAt,
            @Schema(requiredMode = RequiredMode.REQUIRED) MeResponse user) {
    }

    public record MeResponse(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String username,
            @Schema(requiredMode = RequiredMode.REQUIRED) String fullName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Role role,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true,
                    description = "Chỉ có với COMPANY_MANAGER, COLLECTOR") Long companyId) {

        static MeResponse of(User user) {
            return new MeResponse(user.getId(), user.getUsername(), user.getFullName(), user.getRole(),
                    user.getCompanyId());
        }
    }
}
