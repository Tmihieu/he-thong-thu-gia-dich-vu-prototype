package vn.dongthanh.vsmt.platform.api;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.api.UserAdminController.UserDto;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.UserAdminService;

/**
 * Quản lý công ty chỉ xem danh sách người đi thu của công ty mình (BR-PLT-08). Tạo / sửa / khóa / đặt lại mật khẩu
 * do quản trị làm qua {@code /api/platform/users} (UC-04).
 */
@Tag(name = "Người đi thu của công ty (chỉ xem)")
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
}
