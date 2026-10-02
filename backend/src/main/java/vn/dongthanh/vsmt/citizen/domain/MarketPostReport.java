package vn.dongthanh.vsmt.citizen.domain;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Báo cáo bài của người dân; mở tới khi cán bộ xã giữ hoặc gỡ bài. */
@Getter
@Entity
@Table(name = "market_post_reports")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MarketPostReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long postId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false, updatable = false)
    private CitizenAccount reporter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private MarketReportReason reason;

    @Column(updatable = false, length = 500)
    private String note;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    private OffsetDateTime resolvedAt;

    private Long resolvedBy;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MarketReportResolution resolution;

    public static MarketPostReport open(Long postId, CitizenAccount reporter, MarketReportReason reason, String note,
            OffsetDateTime at) {
        MarketPostReport r = new MarketPostReport();
        r.postId = postId;
        r.reporter = reporter;
        r.reason = reason;
        r.note = note;
        r.createdAt = at;
        return r;
    }

    public void resolve(MarketReportResolution resolution, Long userId, OffsetDateTime at) {
        this.resolution = resolution;
        this.resolvedBy = userId;
        this.resolvedAt = at;
    }
}
