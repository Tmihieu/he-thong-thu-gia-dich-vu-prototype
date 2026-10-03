package vn.dongthanh.vsmt.notification.api;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.notification.service.HouseholdReminderService;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Thông báo: nhắc hộ dân nộp phí")
@RestController
@RequestMapping("/api/notifications/household-reminders")
@RequiredArgsConstructor
public class HouseholdReminderController {

    private final HouseholdReminderService reminders;

    public record RunResult(@Schema(requiredMode = RequiredMode.REQUIRED) int sent) {
    }

    @Operation(summary = "Chạy ngay việc nhắc hộ dân nộp phí hôm nay (job tự chạy 08:00 mỗi ngày); không gửi trùng")
    @PostMapping("/run")
    public RunResult run(@AuthenticationPrincipal CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN);
        return new RunResult(reminders.run());
    }
}
