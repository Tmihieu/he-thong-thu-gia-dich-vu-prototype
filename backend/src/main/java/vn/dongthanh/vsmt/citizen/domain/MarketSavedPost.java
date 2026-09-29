package vn.dongthanh.vsmt.citizen.domain;

import java.io.Serializable;
import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Bài người dân đã lưu; riêng từng tài khoản. */
@Getter
@Entity
@Table(name = "market_saved_posts")
@IdClass(MarketSavedPost.Key.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MarketSavedPost {

    @Id
    private Long citizenId;

    @Id
    private Long postId;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static MarketSavedPost of(Long citizenId, Long postId, OffsetDateTime at) {
        MarketSavedPost s = new MarketSavedPost();
        s.citizenId = citizenId;
        s.postId = postId;
        s.createdAt = at;
        return s;
    }

    public record Key(Long citizenId, Long postId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
