package vn.dongthanh.vsmt.citizen.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Bình luận trên bài chợ đồ cũ (data dictionary §3.4). */
@Getter
@Entity
@Table(name = "market_comments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MarketComment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false, updatable = false)
    private MarketPost post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false, updatable = false)
    private CitizenAccount author;

    @Column(nullable = false, updatable = false, length = 1000)
    private String content;

    public static MarketComment create(MarketPost post, CitizenAccount author, String content) {
        MarketComment c = new MarketComment();
        c.post = post;
        c.author = author;
        c.content = content;
        return c;
    }
}
