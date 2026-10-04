package vn.dongthanh.vsmt.platform.api;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserStatus;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.UserAdminService;
import vn.dongthanh.vsmt.platform.service.UserAdminService.UserCommand;

@Tag(name = "Quản trị tài khoản")
@RestController
@RequestMapping("/api/platform/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final UserAdminService admin;

    @Operation(summary = "Danh sách tài khoản web (chỉ quản trị)")
    @GetMapping
    public List<UserDto> listUsers(@AuthenticationPrincipal CurrentUser actor) {
        return admin.list(actor).stream().map(UserDto::of).toList();
    }

    @Operation(summary = "Tạo tài khoản; vai trò công ty / người đi thu bắt buộc chọn công ty")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto createUser(@Valid @RequestBody CreateUserRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.create(req.username(), req.password(), req.toCommand(), actor));
    }

    @Operation(summary = "Sửa họ tên, vai trò, công ty, liên hệ (tên đăng nhập không đổi)")
    @PutMapping("/{id}")
    public UserDto updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.update(id, req.toCommand(), actor));
    }

    @Operation(summary = "Khóa tài khoản (không đăng nhập được nữa)")
    @PostMapping("/{id}/lock")
    public UserDto lockUser(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.setStatus(id, UserStatus.LOCKED, actor));
    }

    @Operation(summary = "Mở khóa tài khoản")
    @PostMapping("/{id}/unlock")
    public UserDto unlockUser(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.setStatus(id, UserStatus.ACTIVE, actor));
    }

    @Operation(summary = "Đặt lại mật khẩu")
    @PostMapping("/{id}/password")
    public UserDto resetUserPassword(@PathVariable Long id, @Valid @RequestBody PasswordRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.resetPassword(id, req.password(), actor));
    }

    public record CreateUserRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "thu07b")
            @NotBlank(message = "không được để trống")
            @Pattern(regexp = "^\\s*[A-Za-z0-9._]{3,50}\\s*$", message = "3–50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới")
            String username,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 100) String fullName,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Role role,
            Long companyId,
            @Pattern(regexp = "^$|^[0-9]{9,15}$", message = "chỉ gồm 9–15 chữ số") String phone,
            @Email(message = "không đúng định dạng") @Size(max = 100) String email,
            @Size(max = 100) String organization,
            @Schema(requiredMode = RequiredMode.REQUIRED)
            @NotBlank(message = "không được để trống") @Size(min = 8, message = "tối thiểu 8 ký tự") String password) {

        UserCommand toCommand() {
            return new UserCommand(fullName, role, companyId, phone, email, organization);
        }

        @Override
        public String toString() {
            return "CreateUserRequest[username=" + username + ", role=" + role + ", password=***]";
        }
    }

    public record UpdateUserRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 100) String fullName,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Role role,
            Long companyId,
            @Pattern(regexp = "^$|^[0-9]{9,15}$", message = "chỉ gồm 9–15 chữ số") String phone,
            @Email(message = "không đúng định dạng") @Size(max = 100) String email,
            @Size(max = 100) String organization) {

        UserCommand toCommand() {
            return new UserCommand(fullName, role, companyId, phone, email, organization);
        }
    }

    public record PasswordRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED)
            @NotBlank(message = "không được để trống") @Size(min = 8, message = "tối thiểu 8 ký tự") String password) {

        @Override
        public String toString() {
            return "PasswordRequest[password=***]";
        }
    }

    public record UserDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String username,
            @Schema(requiredMode = RequiredMode.REQUIRED) String fullName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Role role,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String phone,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String email,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String organization,
            @Schema(requiredMode = RequiredMode.REQUIRED) UserStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime lastLoginAt) {

        static UserDto of(User u) {
            return new UserDto(u.getId(), u.getUsername(), u.getFullName(), u.getRole(), u.getCompanyId(), u.getPhone(),
                    u.getEmail(), u.getOrganization(), u.getStatus(), u.getLastLoginAt());
        }
    }
}
