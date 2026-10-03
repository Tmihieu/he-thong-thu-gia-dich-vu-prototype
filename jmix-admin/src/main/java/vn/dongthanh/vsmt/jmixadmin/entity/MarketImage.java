package vn.dongthanh.vsmt.jmixadmin.entity;

import io.jmix.core.metamodel.annotation.JmixEntity;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

/** Bảng market_images (sinh từ migration của backend). */
@JmixEntity
@Table(name = "market_images")
@Entity(name = "vsmt_MarketImage")
public class MarketImage {

    @Id
    @Column(name = "id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "storage_name", nullable = false, length = 64)
    private String storageName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploader_id")
    private CitizenAccount uploader;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private MarketPost post;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "legacy", nullable = false)
    private Boolean legacy = false;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getStorageName() { return storageName; }
    public void setStorageName(String storageName) { this.storageName = storageName; }
    public CitizenAccount getUploader() { return uploader; }
    public void setUploader(CitizenAccount uploader) { this.uploader = uploader; }
    public MarketPost getPost() { return post; }
    public void setPost(MarketPost post) { this.post = post; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public Boolean getLegacy() { return legacy; }
    public void setLegacy(Boolean legacy) { this.legacy = legacy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
    }
}
