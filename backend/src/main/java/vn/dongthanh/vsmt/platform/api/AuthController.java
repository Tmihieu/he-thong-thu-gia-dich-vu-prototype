package vn.dongthanh.vsmt.platform.api;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.api.AuthDtos.LoginRequest;
import vn.dongthanh.vsmt.platform.api.AuthDtos.LoginResponse;
import vn.dongthanh.vsmt.platform.api.AuthDtos.MeResponse;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuthService;
import vn.dongthanh.vsmt.platform.service.AuthService.LoginResult;

@Tag(name = "Đăng nhập")
@RestController
@RequestMapping("/api/platform/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService auth;

    @Operation(summary = "Đăng nhập bằng tên đăng nhập và mật khẩu, nhận access token")
    @SecurityRequirements
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        LoginResult result = auth.login(request.username(), request.password());
        return new LoginResponse(result.token().value(), "Bearer", result.token().expiresAt(),
                MeResponse.of(result.user()));
    }

    @Operation(summary = "Thông tin tài khoản đang đăng nhập")
    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal CurrentUser actor) {
        return MeResponse.of(auth.me(actor));
    }
}
