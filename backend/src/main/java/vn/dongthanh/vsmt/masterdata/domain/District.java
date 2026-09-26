package vn.dongthanh.vsmt.masterdata.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Địa bàn sau sáp nhập (DTH, TTT, NB). */
@Getter
@Entity
@Table(name = "districts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class District extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 10)
    private String code;

    @Setter
    @Column(nullable = false, length = 100)
    private String name;

    @Setter
    private String note;

    @Setter
    private Integer sortOrder;

    public static District create(String code, String name) {
        District d = new District();
        d.code = code;
        d.name = name;
        return d;
    }
}
