package vn.dongthanh.vsmt.platform.api;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.domain.AuditLog;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditLogQueryService;

@Tag(name = "Nhật ký thao tác")
@RestController
@RequestMapping("/api/platform/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogQueryService audit;

    @Operation(summary = "Nhật ký thao tác (quản trị), mới nhất trước. Lọc theo ngày giờ Việt Nam (gồm trọn ngày"
            + " 'to'), tên đăng nhập người thao tác (chứa chuỗi), mã hành động (đúng mã)")
    @GetMapping
    public AuditLogPageDto search(@RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to, @RequestParam(required = false) String actorUsername,
            @RequestParam(required = false) String action, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size, @AuthenticationPrincipal CurrentUser actor) {
        Page<AuditLog> result = audit.search(from, to, actorUsername, action,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt", "id")), actor);
        return new AuditLogPageDto(result.getContent().stream().map(AuditLogDto::of).toList(),
                result.getTotalElements(), page, size);
    }

    public record AuditLogDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime occurredAt,
            @Schema(requiredMode = RequiredMode.REQUIRED) String actorUsername,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Vai trò lúc thao tác; SYSTEM cho tác vụ tự động")
            String actorRole,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "ISSUE_COMPANY_RECEIPT") String action,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "CompanyReceipt") String entityType,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "PT-CT-1026-001") String entityId,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "JSON trạng thái trước")
            String beforeData,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "JSON trạng thái sau")
            String afterData,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String ipAddress) {

        static AuditLogDto of(AuditLog a) {
            return new AuditLogDto(a.getId(), a.getOccurredAt(), a.getActorUsername(), a.getActorRole(), a.getAction(),
                    a.getEntityType(), a.getEntityId(), a.getBeforeData(), a.getAfterData(), a.getIpAddress());
        }
    }

    public record AuditLogPageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<AuditLogDto> items,
            @Schema(requiredMode = RequiredMode.REQUIRED) long total,
            @Schema(requiredMode = RequiredMode.REQUIRED) int page,
            @Schema(requiredMode = RequiredMode.REQUIRED) int size) {
    }
}
