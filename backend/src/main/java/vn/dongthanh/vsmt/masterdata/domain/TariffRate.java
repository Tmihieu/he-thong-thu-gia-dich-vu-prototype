package vn.dongthanh.vsmt.masterdata.domain;

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

/**
 * Đơn giá một nhóm trong một phiên bản biểu giá: thu gom + vận chuyển (G9) + xử lý (chỉ nhóm cân, bảng mục 3 QĐ 65/2026);
 * {@code monthlyTotal} luôn bằng tổng ba thành phần (CHECK ở bảng).
 */
@Getter
@Entity
@Table(name = "tariff_rates")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TariffRate extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tariff_version_id", nullable = false)
    private TariffVersion tariffVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TariffGroup tariffGroup;

    @Column(nullable = false)
    private long collectionFee;

    @Column(nullable = false)
    private long transportFee;

    @Column(nullable = false)
    private long processingFee;

    @Column(nullable = false)
    private long monthlyTotal;

    @Column(nullable = false, length = 30)
    private String unitLabel;

    /** Sửa đơn giá khi phiên bản còn dự thảo; giữ cùng dòng để không vướng ràng buộc duy nhất (phiên bản, nhóm). */
    void update(long collectionFee, long transportFee, long processingFee, String unitLabel) {
        requireNonNegative(collectionFee, transportFee, processingFee);
        this.collectionFee = collectionFee;
        this.transportFee = transportFee;
        this.processingFee = processingFee;
        this.monthlyTotal = Math.addExact(Math.addExact(collectionFee, transportFee), processingFee);
        this.unitLabel = unitLabel;
    }

    private static void requireNonNegative(long collectionFee, long transportFee, long processingFee) {
        if (collectionFee < 0 || transportFee < 0 || processingFee < 0) {
            throw new IllegalArgumentException("Đơn giá không được âm");
        }
    }

    static TariffRate create(TariffVersion version, TariffGroup group, long collectionFee, long transportFee,
            long processingFee, String unitLabel) {
        TariffRate r = new TariffRate();
        r.tariffVersion = version;
        r.tariffGroup = group;
        r.update(collectionFee, transportFee, processingFee, unitLabel);
        return r;
    }
}
