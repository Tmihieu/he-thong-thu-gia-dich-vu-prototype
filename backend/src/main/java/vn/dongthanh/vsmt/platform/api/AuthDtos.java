package vn.dongthanh.vsmt.platform.api;

import java.time.Instant;

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

    public record LoginResponse(String accessToken, String tokenType, Instant expiresAt, MeResponse user) {
    }

    public record MeResponse(Long id, String username, String fullName, Role role, Long companyId) {

        static MeResponse of(User user) {
            return new MeResponse(user.getId(), user.getUsername(), user.getFullName(), user.getRole(),
                    user.getCompanyId());
        }
    }
}
