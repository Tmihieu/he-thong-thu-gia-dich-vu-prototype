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

/** Khu vực / tổ dân phố. Công ty phụ trách không lưu ở đây mà lấy từ phân công khu vực (T13). */
@Getter
@Entity
@Table(name = "areas")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Area extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 10)
    private String code;

    @Setter
    @Column(nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "district_id", nullable = false)
    private District district;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ActiveStatus status;

    @Setter
    private String note;

    public static Area create(String code, String name, District district) {
        Area a = new Area();
        a.code = code;
        a.name = name;
        a.district = district;
        a.status = ActiveStatus.ACTIVE;
        return a;
    }
}
