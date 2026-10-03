package vn.dongthanh.vsmt.citizen.domain;

import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/**
 * Bài chợ đồ cũ v2 (docs/cho-do-cu-spec.md §6, §8): caption + nhiều tag + danh mục, tổ snapshot lúc đăng, ẩn/hiện độc
 * lập với OPEN/CLOSED, liên hệ tự nguyện. Không có trường giá (D01); cột legacy title/description/... không map.
 */
@Getter
@Entity
@Table(name = "market_posts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MarketPost extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false, updatable = false)
    private CitizenAccount author;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false, updatable = false)
    private Area area;

    @Column(nullable = false, length = 2500)
    private String caption;

    @Enumerated(EnumType.STRING)
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "market_post_tags", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "tag", nullable = false, length = 20)
    private Set<MarketTag> tags = EnumSet.noneOf(MarketTag.class);

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MarketCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MarketPostStatus status;

    @Column(nullable = false)
    private boolean hidden;

    @Column(nullable = false)
    private boolean sharePhone;

    @Getter(AccessLevel.NONE)
    @Column(length = 15)
    private String contactPhone;

    @Column(updatable = false)
    private UUID clientRequestId;

    @Column(updatable = false, length = 64)
    private String requestFingerprint;

    private OffsetDateTime editedAt;

    public static MarketPost create(String code, CitizenAccount author, Content content, UUID requestId,
            String fingerprint) {
        MarketPost p = new MarketPost();
        p.code = code;
        p.author = author;
        p.area = author.getSubject().getArea();
        p.apply(content);
        p.status = MarketPostStatus.OPEN;
        p.clientRequestId = requestId;
        p.requestFingerprint = fingerprint;
        return p;
    }

    /** Sửa nội dung; tác giả/tổ/ngày đăng/trạng thái giữ nguyên. */
    public void edit(Content content, OffsetDateTime at) {
        apply(content);
        editedAt = at;
    }

    private void apply(Content c) {
        caption = c.caption();
        tags.clear();
        tags.addAll(c.tags());
        category = c.category();
        sharePhone = c.contactPhone() != null;
        contactPhone = c.contactPhone();
    }

    public void setStatus(MarketPostStatus status) {
        this.status = status;
    }

    public void setHidden(boolean hidden) {
        this.hidden = hidden;
    }

    public boolean isAuthoredBy(Long accountId) {
        return author.getId().equals(accountId);
    }

    /** Chỉ lấy qua endpoint liên hệ/sửa đã kiểm quyền; DTO feed/chi tiết không chứa số. */
    public String contactPhoneForAuthorizedReader() {
        return contactPhone;
    }

    /** contactPhone null nghĩa là không chia sẻ (tắt chia sẻ xóa số). */
    public record Content(String caption, Set<MarketTag> tags, MarketCategory category, String contactPhone) {
    }
}
