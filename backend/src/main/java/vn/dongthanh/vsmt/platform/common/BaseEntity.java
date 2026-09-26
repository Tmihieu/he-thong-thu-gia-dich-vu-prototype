package vn.dongthanh.vsmt.platform.common;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import lombok.Getter;

/**
 * Trường hệ thống chung của mọi bảng (data dictionary §1.3).
 * {@code createdBy}/{@code updatedBy} được gán từ người đăng nhập khi có CurrentUser (T06).
 */
@Getter
@MappedSuperclass
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(updatable = false)
    private Long createdBy;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    private Long updatedBy;

    @Version
    @Column(nullable = false)
    private int version;

    protected void setCreatedBy(Long userId) {
        this.createdBy = userId;
    }

    protected void setUpdatedBy(Long userId) {
        this.updatedBy = userId;
    }
}
