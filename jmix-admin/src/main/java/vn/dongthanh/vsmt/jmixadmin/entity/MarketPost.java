package vn.dongthanh.vsmt.jmixadmin.entity;

import io.jmix.core.metamodel.annotation.InstanceName;
import io.jmix.core.metamodel.annotation.JmixEntity;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Bảng market_posts (sinh từ migration của backend). */
@JmixEntity
@Table(name = "market_posts")
@Entity(name = "vsmt_MarketPost")
public class MarketPost {

    @Id
    @Column(name = "id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private CitizenAccount author;

    @InstanceName
    @Column(name = "title", length = 150)
    private String title;

    @Column(name = "post_type", length = 30)
    private String postType;

    @Column(name = "description", length = 2000)
    private String description;

    @Lob
    @Column(name = "photo_urls")
    private String photoUrls;

    @Column(name = "pickup_location", length = 255)
    private String pickupLocation;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "OPEN";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version;

    @Column(name = "caption", nullable = false, length = 2500)
    private String caption;

    @Column(name = "category", nullable = false, length = 30)
    private String category = "OTHER";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    @Column(name = "hidden", nullable = false)
    private Boolean hidden = false;

    @Column(name = "share_phone", nullable = false)
    private Boolean sharePhone = false;

    @Column(name = "contact_phone", length = 15)
    private String contactPhone;

    @Column(name = "client_request_id")
    private UUID clientRequestId;

    @Column(name = "request_fingerprint", length = 64)
    private String requestFingerprint;

    @Column(name = "edited_at")
    private OffsetDateTime editedAt;

    @Column(name = "moderation", nullable = false, length = 20)
    private String moderation = "PUBLISHED";

    @Column(name = "moderation_note", length = 500)
    private String moderationNote;

    @Column(name = "moderated_at")
    private OffsetDateTime moderatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderated_by")
    private User moderatedBy;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public CitizenAccount getAuthor() { return author; }
    public void setAuthor(CitizenAccount author) { this.author = author; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getPostType() { return postType; }
    public void setPostType(String postType) { this.postType = postType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getPhotoUrls() { return photoUrls; }
    public void setPhotoUrls(String photoUrls) { this.photoUrls = photoUrls; }
    public String getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Area getArea() { return area; }
    public void setArea(Area area) { this.area = area; }
    public Boolean getHidden() { return hidden; }
    public void setHidden(Boolean hidden) { this.hidden = hidden; }
    public Boolean getSharePhone() { return sharePhone; }
    public void setSharePhone(Boolean sharePhone) { this.sharePhone = sharePhone; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public UUID getClientRequestId() { return clientRequestId; }
    public void setClientRequestId(UUID clientRequestId) { this.clientRequestId = clientRequestId; }
    public String getRequestFingerprint() { return requestFingerprint; }
    public void setRequestFingerprint(String requestFingerprint) { this.requestFingerprint = requestFingerprint; }
    public OffsetDateTime getEditedAt() { return editedAt; }
    public void setEditedAt(OffsetDateTime editedAt) { this.editedAt = editedAt; }
    public String getModeration() { return moderation; }
    public void setModeration(String moderation) { this.moderation = moderation; }
    public String getModerationNote() { return moderationNote; }
    public void setModerationNote(String moderationNote) { this.moderationNote = moderationNote; }
    public OffsetDateTime getModeratedAt() { return moderatedAt; }
    public void setModeratedAt(OffsetDateTime moderatedAt) { this.moderatedAt = moderatedAt; }
    public User getModeratedBy() { return moderatedBy; }
    public void setModeratedBy(User moderatedBy) { this.moderatedBy = moderatedBy; }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
