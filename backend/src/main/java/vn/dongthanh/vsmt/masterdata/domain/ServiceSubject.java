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

    /** Địa chỉ ghép từ số nhà + đường, chỉ đổi qua {@link #setAddressParts}. */
    @Setter(AccessLevel.NONE)
    @Column(nullable = false, length = 255)
    private String address;

    @Setter(AccessLevel.NONE)
    @Column(length = 30)
    private String houseNo;

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, length = 200)
    private String street;

    /** Đường chuẩn trong danh mục; null với địa chỉ cũ chưa chuẩn hóa hoặc đường chờ xác minh. */
    @Setter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "street_id")
    private Street streetRef;

    @Setter(AccessLevel.NONE)
    @Column(nullable = false)
    private boolean streetPending;

    /** Phòng/căn, để phân biệt nhiều đối tượng thu chung một địa chỉ. */
    @Setter(AccessLevel.NONE)
    @Column(length = 30)
    private String unitNo;

    /** Mô tả vị trí khi nhà chưa có số (đối diện, cạnh...). */
    @Setter(AccessLevel.NONE)
    @Column(length = 255)
    private String locationNote;

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

    public static ServiceSubject create(String code, SubjectType type, String name, String houseNo, String street,
            Area area) {
        ServiceSubject s = new ServiceSubject();
        s.code = code;
        s.subjectType = type;
        s.name = name;
        s.setAddressParts(houseNo, street);
        s.area = area;
        s.status = SubjectStatus.PENDING;
        return s;
    }

    /** Số nhà không bắt buộc (nhà chưa có số); đường/hẻm/ấp bắt buộc. Giữ liên kết đường hiện có. */
    public void setAddressParts(String houseNo, String street) {
        this.houseNo = houseNo;
        this.street = street;
        this.address = houseNo == null ? street : houseNo + " " + street;
    }

    /**
     * Địa chỉ chuẩn hóa: {@code streetRef} null thì {@code street} là văn bản cán bộ nhập (đường chờ xác minh hoặc
     * địa chỉ cũ). Có đường chuẩn thì tên hiển thị lấy từ danh mục.
     */
    public void setStructuredAddress(String houseNo, String unitNo, String locationNote, Street streetRef,
            String streetText, boolean streetPending) {
        this.streetRef = streetRef;
        this.streetPending = streetRef == null && streetPending;
        this.unitNo = unitNo;
        this.locationNote = locationNote;
        setAddressParts(houseNo, streetRef != null ? streetRef.getName() : streetText);
        if (unitNo != null) {
            this.address = this.address + ", " + unitNo;
        }
    }
}
