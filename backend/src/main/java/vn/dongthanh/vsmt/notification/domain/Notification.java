package vn.dongthanh.vsmt.notification.domain;

import java.time.OffsetDateTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.platform.domain.Role;

/**
 * Thông báo trong hệ thống. Người nhận là một vai trò, một công ty (có thể giới hạn thêm theo vai trò), một người
 * dùng hoặc một người dân. Đã đọc tính chung trên bản ghi (D7). Không có trường chung updated/version.
 */
@Getter
@Entity
@Table(name = "notifications")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private RecipientType recipientType;

    @Enumerated(EnumType.STRING)
    @Column(updatable = false, length = 30)
    private Role recipientRole;

    @Column(updatable = false)
    private Long recipientCompanyId;

    @Column(updatable = false)
    private Long recipientUserId;

    @Column(updatable = false)
    private Long recipientCitizenId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private NotificationKind kind;

    @Column(nullable = false, updatable = false, length = 200)
    private String title;

    @Column(nullable = false, updatable = false, length = 2000)
    private String body;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(updatable = false)
    private String link;

    private OffsetDateTime readAt;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(updatable = false)
    private Long createdBy;

    public static Notification create(RecipientType type, Role role, Long companyId, Long userId, Long citizenId,
            NotificationKind kind, String title, String body, String link, OffsetDateTime createdAt, Long createdBy) {
        Notification n = new Notification();
        n.recipientType = type;
        n.recipientRole = role;
        n.recipientCompanyId = companyId;
        n.recipientUserId = userId;
        n.recipientCitizenId = citizenId;
        n.kind = kind;
        n.title = title;
        n.body = body;
        n.link = link;
        n.createdAt = createdAt;
        n.createdBy = createdBy;
        return n;
    }

    public void markRead(OffsetDateTime at) {
        if (readAt == null) {
            readAt = at;
        }
    }
}
