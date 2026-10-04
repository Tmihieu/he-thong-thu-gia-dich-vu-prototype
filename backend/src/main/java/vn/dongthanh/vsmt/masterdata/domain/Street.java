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
import lombok.Setter;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Đường/hẻm trong danh mục chuẩn của một xã/phường. Hồ sơ hộ liên kết bằng {@code id}, không bằng tên. */
@Getter
@Entity
@Table(name = "streets")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Street extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "district_id", nullable = false, updatable = false)
    private District district;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 200)
    private String nameKey;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ActiveStatus status;

    /** Id tham chiếu của Goong khi cán bộ đã đối chiếu; không dùng làm định danh. */
    @Setter
    @Column(length = 600)
    private String goongPlaceId;

    public static Street create(District district, String name, String goongPlaceId) {
        Street s = new Street();
        s.district = district;
        s.name = name.trim().replaceAll("\\s+", " ");
        s.nameKey = AddressText.streetKey(name);
        s.status = ActiveStatus.ACTIVE;
        s.goongPlaceId = goongPlaceId;
        return s;
    }
}
