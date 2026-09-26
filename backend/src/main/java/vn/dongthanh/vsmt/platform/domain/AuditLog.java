package vn.dongthanh.vsmt.platform.domain;

import java.time.OffsetDateTime;

import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Một dòng nhật ký thao tác (data dictionary §2.1 AuditLog). Chỉ thêm; bảng có trigger chặn sửa/xóa.
 * Không có trường chung ngoài {@code id}.
 */
@Getter
@Entity
@Immutable
@Table(name = "audit_logs")
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private OffsetDateTime occurredAt;

    private Long actorUserId;

    @Column(nullable = false, length = 50)
    private String actorUsername;

    @Column(nullable = false, length = 30)
    private String actorRole;

    @Column(nullable = false, length = 60)
    private String action;

    @Column(nullable = false, length = 40)
    private String entityType;

    @Column(nullable = false, length = 40)
    private String entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    private String beforeData;

    @JdbcTypeCode(SqlTypes.JSON)
    private String afterData;

    @Column(length = 45)
    private String ipAddress;
}
