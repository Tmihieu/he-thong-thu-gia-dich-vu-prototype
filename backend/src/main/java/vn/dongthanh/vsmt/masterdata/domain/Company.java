package vn.dongthanh.vsmt.masterdata.domain;

import java.time.LocalDate;

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

/** Công ty môi trường (data dictionary §2.2 Company). */
@Getter
@Setter
@Entity
@Table(name = "companies")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Company extends BaseEntity {

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, updatable = false, length = 10)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 100)
    private String contactName;

    @Column(nullable = false, length = 15)
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ActiveStatus status;

    @Column(nullable = false)
    private LocalDate validFrom;

    private LocalDate validTo;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private CompanyType orgType;

    @Column(length = 14)
    private String taxCode;

    @Column(length = 255)
    private String address;

    @Column(length = 100)
    private String email;

    @Column(length = 50)
    private String communeContractNo;

    @Column(length = 50)
    private String bankAccount;

    @Column(length = 100)
    private String bankName;

    public static Company create(String code, String name, String contactName, String contactPhone,
            LocalDate validFrom) {
        Company c = new Company();
        c.code = code;
        c.name = name;
        c.contactName = contactName;
        c.contactPhone = contactPhone;
        c.status = ActiveStatus.ACTIVE;
        c.validFrom = validFrom;
        return c;
    }
}
