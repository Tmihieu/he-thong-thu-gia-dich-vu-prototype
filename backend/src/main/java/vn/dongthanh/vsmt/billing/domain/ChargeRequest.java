package vn.dongthanh.vsmt.billing.domain;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Phiếu yêu cầu thu đã phát hành. Số khoản, tổng tiền không lưu mà tính từ {@link Charge}. */
@Getter
@Entity
@Table(name = "charge_requests")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChargeRequest extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false, updatable = false)
    private CollectionPeriod period;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fee_type_id", nullable = false, updatable = false)
    private FeeType feeType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private ChargeScope scopeType;

    @ManyToMany
    @JoinTable(name = "charge_request_areas", joinColumns = @JoinColumn(name = "charge_request_id"),
            inverseJoinColumns = @JoinColumn(name = "area_id"))
    private Set<Area> scopeAreas = new LinkedHashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scope_company_id", updatable = false)
    private Company scopeCompany;

    @Column(nullable = false, updatable = false)
    private LocalDate issueDate;

    @Column(nullable = false)
    private LocalDate dueDate;

    private Long unitPrice;

    private String note;

    public static ChargeRequest issue(String code, CollectionPeriod period, FeeType feeType, ChargeScope scope,
            Set<Area> areas, Company company, LocalDate issueDate, LocalDate dueDate, Long unitPrice, String note,
            Long issuedBy) {
        ChargeRequest r = new ChargeRequest();
        r.code = code;
        r.period = period;
        r.feeType = feeType;
        r.scopeType = scope;
        if (scope == ChargeScope.AREAS) {
            r.scopeAreas.addAll(areas);
        }
        r.scopeCompany = scope == ChargeScope.COMPANY ? company : null;
        r.issueDate = issueDate;
        r.dueDate = dueDate;
        r.unitPrice = unitPrice;
        r.note = note;
        r.setCreatedBy(issuedBy);
        return r;
    }
}
