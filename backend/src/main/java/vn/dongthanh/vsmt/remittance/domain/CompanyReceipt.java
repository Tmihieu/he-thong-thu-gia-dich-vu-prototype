package vn.dongthanh.vsmt.remittance.domain;

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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Phiếu thu xã lập khi công ty nộp tiền (R15). Không sửa, không hủy; sai thì lập phiếu mới (G6). */
@Getter
@Entity
@Table(name = "company_receipts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompanyReceipt extends BaseEntity {

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private ReceiptMethod method;

    @Column(nullable = false, updatable = false)
    private LocalDate receiptDate;

    @Column(nullable = false, updatable = false, length = 100)
    private String payerName;

    @Column(updatable = false, length = 50)
    private String documentRef;

    @Column(updatable = false, length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReceiptStatus status;

    @Builder
    private static CompanyReceipt issue(String code, Company company, CollectionPeriod period, long amount,
            ReceiptMethod method, LocalDate receiptDate, String payerName, String documentRef, String note,
            Long issuedBy) {
        CompanyReceipt r = new CompanyReceipt();
        r.code = code;
        r.company = company;
        r.period = period;
        r.amount = amount;
        r.method = method;
        r.receiptDate = receiptDate;
        r.payerName = payerName;
        r.documentRef = documentRef;
        r.note = note;
        r.status = ReceiptStatus.RECORDED;
        r.setCreatedBy(issuedBy);
        return r;
    }
}
