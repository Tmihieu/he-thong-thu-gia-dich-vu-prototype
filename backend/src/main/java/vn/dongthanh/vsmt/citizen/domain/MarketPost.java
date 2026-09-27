package vn.dongthanh.vsmt.citizen.domain;

import java.util.List;

import jakarta.persistence.Column;
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
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Bài đăng chợ đồ cũ (data dictionary §3.4). Không kiểm duyệt (O6); chỉ người đăng đổi trạng thái (D9). */
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

    @Column(nullable = false, length = 150)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MarketPostType postType;

    @Column(nullable = false, length = 2000)
    private String description;

    /** Cột {@code photo_urls} lưu tên file trong PhotoStorage, mỗi dòng một tên (như rác cồng kềnh); URL dựng ở API. */
    @Getter(AccessLevel.NONE)
    @Column(name = "photo_urls")
    private String photoNames;

    @Column(length = 255)
    private String pickupLocation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MarketPostStatus status;

    public static MarketPost create(String code, CitizenAccount author, String title, MarketPostType postType,
            String description, List<String> photoNames, String pickupLocation) {
        MarketPost p = new MarketPost();
        p.code = code;
        p.author = author;
        p.title = title;
        p.postType = postType;
        p.description = description;
        p.photoNames = photoNames.isEmpty() ? null : String.join("\n", photoNames);
        p.pickupLocation = pickupLocation;
        p.status = MarketPostStatus.OPEN;
        return p;
    }

    public List<String> getPhotoNames() {
        return photoNames == null ? List.of() : List.of(photoNames.split("\n"));
    }

    public boolean isAuthoredBy(Long accountId) {
        return author.getId().equals(accountId);
    }

    public void changeStatus(MarketPostStatus status) {
        this.status = status;
    }
}
