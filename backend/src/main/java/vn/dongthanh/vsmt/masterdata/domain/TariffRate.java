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
 * Đơn giá một nhóm trong một phiên bản biểu giá. Chỉ 2 thành phần thu gom + xử lý (G9);
 * {@code monthlyTotal} luôn bằng tổng hai thành phần (CHECK ở bảng).
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
    private long processingFee;

    @Column(nullable = false)
    private long monthlyTotal;

    @Column(nullable = false, length = 30)
    private String unitLabel;

    static TariffRate create(TariffVersion version, TariffGroup group, long collectionFee, long processingFee,
            String unitLabel) {
        if (collectionFee < 0 || processingFee < 0) {
            throw new IllegalArgumentException("Đơn giá không được âm");
        }
        TariffRate r = new TariffRate();
        r.tariffVersion = version;
        r.tariffGroup = group;
        r.collectionFee = collectionFee;
        r.processingFee = processingFee;
        r.monthlyTotal = Math.addExact(collectionFee, processingFee);
        r.unitLabel = unitLabel;
        return r;
    }
}
