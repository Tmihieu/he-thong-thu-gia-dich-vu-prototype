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

/** A chặn B: bản ghi có hướng, hiệu lực hai chiều trong chợ (spec §6.2). */
@Getter
@Entity
@Table(name = "market_user_blocks")
@IdClass(MarketUserBlock.Key.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MarketUserBlock {

    @Id
    private Long blockerId;

    @Id
    private Long blockedId;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static MarketUserBlock of(Long blockerId, Long blockedId, OffsetDateTime at) {
        MarketUserBlock b = new MarketUserBlock();
        b.blockerId = blockerId;
        b.blockedId = blockedId;
        b.createdAt = at;
        return b;
    }

    public record Key(Long blockerId, Long blockedId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
