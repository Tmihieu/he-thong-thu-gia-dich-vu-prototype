package vn.dongthanh.vsmt.masterdata.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Loại phí (ENV theo biểu giá, EXTRA giá cố định). Không có BULKY (G13, O5). */
@Getter
@Setter
@Entity
@Table(name = "fee_types")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FeeType extends BaseEntity {

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PricingMode pricingMode;

    /** Bắt buộc khi {@link PricingMode#FIXED}. */
    private Long defaultPrice;

    @Column(nullable = false)
    private boolean active;

    public static FeeType create(String code, String name, PricingMode mode, Long defaultPrice) {
        if (mode == PricingMode.FIXED && defaultPrice == null) {
            throw new IllegalArgumentException("Loại phí giá cố định phải có giá mặc định");
        }
        FeeType f = new FeeType();
        f.code = code;
        f.name = name;
        f.pricingMode = mode;
        f.defaultPrice = defaultPrice;
        f.active = true;
        return f;
    }
}
