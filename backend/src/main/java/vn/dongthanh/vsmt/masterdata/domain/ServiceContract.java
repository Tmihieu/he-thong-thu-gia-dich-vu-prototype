package vn.dongthanh.vsmt.masterdata.domain;

import java.time.LocalDate;

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
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Đăng ký dịch vụ (hợp đồng) của một đối tượng: nhóm giá, hiệu lực, miễn 100%.
 * Mỗi đối tượng tối đa một hợp đồng hiệu lực tại một thời điểm (service + exclusion constraint).
 */
@Getter
@Entity
@Table(name = "service_contracts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceContract extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 30)
    private String contractNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false, updatable = false)
    private ServiceSubject subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TariffGroup tariffGroup;

    @Column(nullable = false)
    private LocalDate validFrom;

    private LocalDate validTo;

    @Column(nullable = false)
    private boolean exempt;

    @Column(length = 255)
    private String exemptReason;

    @Column(length = 50)
    private String exemptDecisionNo;

    @Setter
    private String note;

    public static ServiceContract create(String contractNo, ServiceSubject subject, TariffGroup group,
            LocalDate validFrom, LocalDate validTo, boolean exempt, String exemptReason, String exemptDecisionNo) {
        ServiceContract c = new ServiceContract();
        c.contractNo = contractNo;
        c.subject = subject;
        c.change(group, validFrom, validTo, exempt, exemptReason, exemptDecisionNo);
        return c;
    }

    /** Sửa nhóm giá, hiệu lực, miễn; kiểm tra ngày và lý do miễn. */
    public void change(TariffGroup group, LocalDate validFrom, LocalDate validTo, boolean exempt, String exemptReason,
            String exemptDecisionNo) {
        if (validTo != null && validTo.isBefore(validFrom)) {
            throw new BusinessRuleException("CONTRACT_DATES_INVALID", "Ngày hết hiệu lực không được trước ngày bắt đầu.");
        }
        if (exempt && (exemptReason == null || exemptReason.isBlank())) {
            throw new BusinessRuleException("EXEMPT_REASON_REQUIRED", "Miễn 100% phải ghi lý do miễn.");
        }
        this.tariffGroup = group;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.exempt = exempt;
        this.exemptReason = exempt ? exemptReason.trim() : null;
        this.exemptDecisionNo = exempt ? exemptDecisionNo : null;
    }

    public boolean covers(LocalDate date) {
        return !date.isBefore(validFrom) && (validTo == null || !date.isAfter(validTo));
    }

    /** Hai khoảng hiệu lực (hai đầu tính cả, đầu cuối null = vô hạn) có giao nhau không. */
    public boolean overlaps(LocalDate from, LocalDate to) {
        boolean startsBeforeOtherEnds = to == null || !validFrom.isAfter(to);
        boolean endsAfterOtherStarts = validTo == null || !validTo.isBefore(from);
        return startsBeforeOtherEnds && endsAfterOtherStarts;
    }

    /** Kết thúc hiệu lực vào ngày {@code lastDay}; hợp đồng đã hết trước đó thì giữ nguyên. */
    public void closeOn(LocalDate lastDay) {
        if (validTo == null || validTo.isAfter(lastDay)) {
            this.validTo = lastDay.isBefore(validFrom) ? validFrom : lastDay;
        }
    }
}
