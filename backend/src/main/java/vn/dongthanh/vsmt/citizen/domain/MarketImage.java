package vn.dongthanh.vsmt.citizen.domain;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Metadata quyền ảnh chợ (spec §9); bytes ở PhotoStorage. Không xóa khi tháo khỏi bài ({@code postId = null}) để route
 * ảnh cũ vẫn biết file thuộc chợ. Legacy: uploaderId null, chỉ giữ được trên đúng bài cũ; tháo rồi
 * thì không gắn lại (tải lại ảnh).
 */
@Getter
@Entity
@Table(name = "market_images")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MarketImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false, length = 64)
    private String storageName;

    @Column(updatable = false)
    private Long uploaderId;

    private Long postId;

    private int sortOrder;

    @Column(nullable = false, updatable = false)
    private boolean legacy;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static MarketImage uploaded(String storageName, Long uploaderId, OffsetDateTime at) {
        MarketImage i = new MarketImage();
        i.storageName = storageName;
        i.uploaderId = uploaderId;
        i.createdAt = at;
        return i;
    }

    public void attach(Long postId, int sortOrder) {
        this.postId = postId;
        this.sortOrder = sortOrder;
    }

    public void detach() {
        this.postId = null;
    }
}
