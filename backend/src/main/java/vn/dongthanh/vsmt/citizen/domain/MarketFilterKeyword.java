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

/** Từ khóa lọc trước khi đăng do cán bộ xã quản lý; bài chứa từ khóa phải chờ duyệt. */
@Getter
@Entity
@Table(name = "market_filter_keywords")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MarketFilterKeyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false, length = 100)
    private String keyword;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(updatable = false)
    private Long createdBy;

    public static MarketFilterKeyword of(String keyword, Long userId, OffsetDateTime at) {
        MarketFilterKeyword k = new MarketFilterKeyword();
        k.keyword = keyword;
        k.createdBy = userId;
        k.createdAt = at;
        return k;
    }
}
