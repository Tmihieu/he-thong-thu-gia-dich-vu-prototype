package vn.dongthanh.vsmt.platform.service;

import java.time.OffsetDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.domain.AuditLog;
import vn.dongthanh.vsmt.platform.domain.AuditLogRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Ghi nhật ký thao tác. Mọi service tạo/sửa tiền và thao tác quản trị gọi {@link #record}.
 * Bắt buộc chạy trong transaction nghiệp vụ đang mở ({@code MANDATORY}) để rollback cùng nhau;
 * người thao tác lấy từ {@link CurrentUser} (dựng từ token), không nhận từ dữ liệu client gửi lên.
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    static final String SYSTEM_ACTOR = "system";

    private final AuditLogRepository logs;
    private final ObjectMapper json;

    /**
     * @param before trạng thái trước (null khi tạo mới); được lưu dạng JSON
     * @param after  trạng thái sau (null khi xóa); được lưu dạng JSON
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public AuditLog record(CurrentUser actor, String action, String entityType, Object entityId,
            Object before, Object after) {
        return save(actor.id(), actor.username(), actor.role().name(), action, entityType, entityId, before, after);
    }

    /** Tác vụ tự động của hệ thống (không có người đăng nhập). */
    @Transactional(propagation = Propagation.MANDATORY)
    public AuditLog recordSystem(String action, String entityType, Object entityId, Object before, Object after) {
        return save(null, SYSTEM_ACTOR, "SYSTEM", action, entityType, entityId, before, after);
    }

    private AuditLog save(Long actorId, String username, String role, String action, String entityType,
            Object entityId, Object before, Object after) {
        return logs.save(AuditLog.builder()
                .occurredAt(OffsetDateTime.now())
                .actorUserId(actorId)
                .actorUsername(username)
                .actorRole(role)
                .action(action)
                .entityType(entityType)
                .entityId(String.valueOf(entityId))
                .beforeData(toJson(before))
                .afterData(toJson(after))
                .ipAddress(currentIp())
                .build());
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Không chuyển được dữ liệu audit sang JSON", e);
        }
    }

    private static String currentIp() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs
                ? attrs.getRequest().getRemoteAddr()
                : null;
    }
}
