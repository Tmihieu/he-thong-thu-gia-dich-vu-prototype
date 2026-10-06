package vn.dongthanh.vsmt.remittance.domain;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Phiếu chi trả công ty: xã trả lại tiền khi phải nộp xã của công ty trong kỳ âm (UC-55). Không sửa, không hủy. */
@Getter
@Entity
@Table(name = "commune_payouts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunePayout extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, updatable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false, updatable = false)
    private CollectionPeriod period;

    @Column(nullable = false, updatable = false)
    private long amount;

    @Column(nullable = false, updatable = false)
    private LocalDate payoutDate;

    @Column(updatable = false, length = 500)
    private String note;

    @Builder
    private static CommunePayout issue(String code, Company company, CollectionPeriod period, long amount,
            LocalDate payoutDate, String note, Long issuedBy) {
        CommunePayout p = new CommunePayout();
        p.code = code;
        p.company = company;
        p.period = period;
        p.amount = amount;
        p.payoutDate = payoutDate;
        p.note = note;
        p.setCreatedBy(issuedBy);
        return p;
    }
}
