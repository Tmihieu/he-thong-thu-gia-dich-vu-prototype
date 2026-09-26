package vn.dongthanh.vsmt.notification.api;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.notification.domain.Notification;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Thông báo")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notifications;
    private final ObjectMapper json;

    @Operation(summary = "Thông báo của người đang đăng nhập (theo vai trò, công ty, cá nhân), mới nhất trước")
    @GetMapping
    public NotificationPageDto list(@RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") @Min(0) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @AuthenticationPrincipal CurrentUser actor) {
        Page<Notification> result = notifications.list(actor, unreadOnly,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        return new NotificationPageDto(result.getContent().stream().map(this::toDto).toList(),
                result.getTotalElements(), notifications.unreadCount(actor));
    }

    @Operation(summary = "Số thông báo chưa đọc")
    @GetMapping("/unread-count")
    public UnreadCountDto unreadCount(@AuthenticationPrincipal CurrentUser actor) {
        return new UnreadCountDto(notifications.unreadCount(actor));
    }

    @Operation(summary = "Đánh dấu đã đọc (chung cho cả nhóm nhận, D7)")
    @PostMapping("/{id}/read")
    public NotificationDto read(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return toDto(notifications.markRead(id, actor));
    }

    @Operation(summary = "Đánh dấu tất cả đã đọc")
    @PostMapping("/read-all")
    public UnreadCountDto readAll(@AuthenticationPrincipal CurrentUser actor) {
        notifications.markAllRead(actor);
        return new UnreadCountDto(notifications.unreadCount(actor));
    }

    NotificationDto toDto(Notification n) {
        JsonNode link = null;
        try {
            link = n.getLink() == null ? null : json.readTree(n.getLink());
        } catch (Exception e) {
            // liên kết hỏng thì bỏ qua, vẫn hiện thông báo
        }
        return new NotificationDto(n.getId(), n.getKind(), n.getTitle(), n.getBody(), link, n.getCreatedAt(),
                n.getReadAt());
    }

    public record NotificationDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) NotificationKind kind,
            @Schema(requiredMode = RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = RequiredMode.REQUIRED) String body,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, implementation = NotificationLink.class)
            JsonNode link,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime readAt) {
    }

    /** Đích điều hướng trong ứng dụng. */
    public record NotificationLink(
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "remittance.receipts") String screen,
            @Schema(description = "Tham số màn hình, vd. {\"periodId\": 5}") Map<String, Object> params) {
    }

    public record NotificationPageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<NotificationDto> items,
            @Schema(requiredMode = RequiredMode.REQUIRED) long total,
            @Schema(requiredMode = RequiredMode.REQUIRED) long unreadCount) {
    }

    public record UnreadCountDto(@Schema(requiredMode = RequiredMode.REQUIRED) long unreadCount) {
    }
}
