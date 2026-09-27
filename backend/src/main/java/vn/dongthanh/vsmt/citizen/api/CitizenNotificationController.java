package vn.dongthanh.vsmt.citizen.api;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
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
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.service.CitizenQueryService;
import vn.dongthanh.vsmt.notification.domain.Notification;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

/** Tab Thông báo của app người dân (T44): lấy bằng polling, không push thật. */
@Tag(name = "App người dân: thông báo")
@RestController
@Validated
@RequestMapping("/api/citizen/notifications")
@RequiredArgsConstructor
public class CitizenNotificationController {

    private final CitizenQueryService citizens;
    private final NotificationService notifications;
    private final ObjectMapper json;

    @Operation(summary = "Thông báo của tài khoản người dân, mới nhất trước; lọc theo loại (Phản ánh / Giao dịch)")
    @GetMapping
    public CitizenNotificationPageDto list(@AuthenticationPrincipal CurrentCitizen citizen,
            @RequestParam(defaultValue = "false") boolean unreadOnly, @RequestParam(required = false) NotificationKind kind,
            @RequestParam(defaultValue = "0") @Min(0) int page, @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        CitizenAccount account = citizens.requireActive(citizen);
        Page<Notification> result = notifications.listForCitizen(account.getId(), unreadOnly, kind,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        return new CitizenNotificationPageDto(result.getContent().stream().map(this::toDto).toList(),
                result.getTotalElements(), notifications.unreadCountForCitizen(account.getId()));
    }

    @Operation(summary = "Số thông báo chưa đọc (badge trên tab)")
    @GetMapping("/unread-count")
    public UnreadCountDto unreadCount(@AuthenticationPrincipal CurrentCitizen citizen) {
        return new UnreadCountDto(notifications.unreadCountForCitizen(citizens.requireActive(citizen).getId()));
    }

    @Operation(summary = "Đánh dấu một thông báo đã đọc")
    @PostMapping("/{id}/read")
    public CitizenNotificationDto read(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id) {
        return toDto(notifications.markReadForCitizen(id, citizens.requireActive(citizen).getId()));
    }

    @Operation(summary = "Đánh dấu tất cả đã đọc")
    @PostMapping("/read-all")
    public UnreadCountDto readAll(@AuthenticationPrincipal CurrentCitizen citizen) {
        Long accountId = citizens.requireActive(citizen).getId();
        notifications.markAllReadForCitizen(accountId);
        return new UnreadCountDto(notifications.unreadCountForCitizen(accountId));
    }

    private CitizenNotificationDto toDto(Notification n) {
        JsonNode link = null;
        try {
            link = n.getLink() == null ? null : json.readTree(n.getLink());
        } catch (Exception e) {
            // liên kết hỏng thì bỏ qua, vẫn hiện thông báo
        }
        return new CitizenNotificationDto(n.getId(), n.getKind(), n.getTitle(), n.getBody(), link, n.getCreatedAt(),
                n.getReadAt());
    }

    public record CitizenNotificationLink(
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "citizen.complaintDetail") String screen,
            @Schema(description = "Tham số màn hình, vd. {\"complaintId\": 5} hoặc {\"paymentId\": 9}")
            Map<String, Object> params) {
    }

    public record CitizenNotificationDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) NotificationKind kind,
            @Schema(requiredMode = RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = RequiredMode.REQUIRED) String body,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, implementation = CitizenNotificationLink.class)
            JsonNode link,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime readAt) {
    }

    public record CitizenNotificationPageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<CitizenNotificationDto> items,
            @Schema(requiredMode = RequiredMode.REQUIRED) long total,
            @Schema(requiredMode = RequiredMode.REQUIRED) long unreadCount) {
    }

    public record UnreadCountDto(@Schema(requiredMode = RequiredMode.REQUIRED) long unreadCount) {
    }
}
