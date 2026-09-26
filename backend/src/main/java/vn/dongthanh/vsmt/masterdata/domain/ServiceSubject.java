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

/** Đối tượng sử dụng dịch vụ: hộ gia đình, hộ kinh doanh, doanh nghiệp (data dictionary §2.2). */
@Getter
@Setter
@Entity
@Table(name = "service_subjects")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceSubject extends BaseEntity {

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SubjectType subjectType;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    @Column(length = 15)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SubjectStatus status;

    private Integer memberCount;

    @Column(length = 100)
    private String representativeName;

    @Column(length = 14)
    private String taxCode;

    private String note;

    public static ServiceSubject create(String code, SubjectType type, String name, String address, Area area) {
        ServiceSubject s = new ServiceSubject();
        s.code = code;
        s.subjectType = type;
        s.name = name;
        s.address = address;
        s.area = area;
        s.status = SubjectStatus.PENDING;
        return s;
    }
}
