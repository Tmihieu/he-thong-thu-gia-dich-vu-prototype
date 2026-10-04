package vn.dongthanh.vsmt.platform.api;

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
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.api.UserAdminController.PasswordRequest;
import vn.dongthanh.vsmt.platform.api.UserAdminController.UserDto;
import vn.dongthanh.vsmt.platform.domain.UserStatus;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.UserAdminService;
import vn.dongthanh.vsmt.platform.service.UserAdminService.CollectorCommand;

/**
 * Quản lý công ty tự cấp và quản tài khoản người đi thu của công ty mình (BR-PLT-08). Vai trò và công ty không nằm
 * trong request: máy chủ ép COLLECTOR và công ty của người gọi.
 */
@Tag(name = "Tài khoản người đi thu (công ty)")
@RestController
@RequestMapping("/api/platform/collector-accounts")
@RequiredArgsConstructor
public class CollectorAccountController {

    private final UserAdminService admin;

    @Operation(summary = "Danh sách tài khoản người đi thu của công ty mình (quản lý công ty)")
    @GetMapping
    public List<UserDto> list(@AuthenticationPrincipal CurrentUser actor) {
        return admin.listCollectors(actor).stream().map(UserDto::of).toList();
    }

    @Operation(summary = "Tạo tài khoản người đi thu thuộc công ty của người gọi")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@Valid @RequestBody CreateCollectorRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.createCollector(req.username(), req.password(), req.toCommand(), actor));
    }

    @Operation(summary = "Sửa họ tên, liên hệ của người đi thu (tên đăng nhập không đổi)")
    @PutMapping("/{id}")
    public UserDto update(@PathVariable Long id, @Valid @RequestBody UpdateCollectorRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.updateCollector(id, req.toCommand(), actor));
    }

    @Operation(summary = "Khóa tài khoản người đi thu")
    @PostMapping("/{id}/lock")
    public UserDto lock(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.setCollectorStatus(id, UserStatus.LOCKED, actor));
    }

    @Operation(summary = "Mở khóa tài khoản người đi thu")
    @PostMapping("/{id}/unlock")
    public UserDto unlock(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.setCollectorStatus(id, UserStatus.ACTIVE, actor));
    }

    @Operation(summary = "Đặt lại mật khẩu người đi thu")
    @PostMapping("/{id}/password")
    public UserDto resetPassword(@PathVariable Long id, @Valid @RequestBody PasswordRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return UserDto.of(admin.resetCollectorPassword(id, req.password(), actor));
    }

    public record CreateCollectorRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "thu07b")
            @NotBlank(message = "không được để trống")
            @Pattern(regexp = "^\s*[A-Za-z0-9._]{3,50}\s*$", message = "3–50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới")
            String username,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 100) String fullName,
            @Pattern(regexp = "^$|^[0-9]{9,15}$", message = "chỉ gồm 9–15 chữ số") String phone,
            @Email(message = "không đúng định dạng") @Size(max = 100) String email,
            @Schema(requiredMode = RequiredMode.REQUIRED)
            @NotBlank(message = "không được để trống") @Size(min = 8, message = "tối thiểu 8 ký tự") String password) {

        CollectorCommand toCommand() {
            return new CollectorCommand(fullName, phone, email);
        }

        @Override
        public String toString() {
            return "CreateCollectorRequest[username=" + username + ", password=***]";
        }
    }

    public record UpdateCollectorRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 100) String fullName,
            @Pattern(regexp = "^$|^[0-9]{9,15}$", message = "chỉ gồm 9–15 chữ số") String phone,
            @Email(message = "không đúng định dạng") @Size(max = 100) String email) {

        CollectorCommand toCommand() {
            return new CollectorCommand(fullName, phone, email);
        }
    }
}
