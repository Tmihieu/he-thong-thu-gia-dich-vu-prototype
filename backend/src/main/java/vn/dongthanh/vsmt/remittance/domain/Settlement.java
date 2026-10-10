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

/**
 * Phiếu quyết toán (07/10): mỗi công ty mỗi kỳ một phiếu, lập sau hạn dân đóng. Ghi số công ty phải nộp xã (vận chuyển,
 * xử lý trong tiền mặt) và xã phải trả công ty (thu gom trong QR) tại lúc lập; chênh lệch dương công ty nộp xã, âm xã trả
 * công ty, 0 không chuyển tiền. Không sửa, không hủy.
 */
@Getter
@Entity
@Table(name = "settlements")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Settlement extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, updatable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false, updatable = false)
    private CollectionPeriod period;

    @Column(nullable = false, updatable = false)
    private long companyOwes;

    @Column(nullable = false, updatable = false)
    private long communeOwes;

    /** Chênh lệch = công ty phải nộp − xã phải trả. */
    @Column(nullable = false, updatable = false)
    private long amount;

    /** Null khi chênh lệch bằng 0 (không chuyển tiền). */
    @Enumerated(EnumType.STRING)
    @Column(updatable = false, length = 30)
    private ReceiptMethod method;

    @Column(nullable = false, updatable = false)
    private LocalDate settleDate;

    @Column(nullable = false, updatable = false, length = 100)
    private String representativeName;

    @Column(updatable = false, length = 50)
    private String documentRef;

    @Column(updatable = false, length = 500)
    private String note;

    @Builder
    private static Settlement issue(String code, Company company, CollectionPeriod period, long companyOwes,
            long communeOwes, ReceiptMethod method, LocalDate settleDate, String representativeName, String documentRef,
            String note, Long issuedBy) {
        Settlement s = new Settlement();
        s.code = code;
        s.company = company;
        s.period = period;
        s.companyOwes = companyOwes;
        s.communeOwes = communeOwes;
        s.amount = companyOwes - communeOwes;
        s.method = s.amount == 0 ? null : method;
        s.settleDate = settleDate;
        s.representativeName = representativeName;
        s.documentRef = documentRef;
        s.note = note;
        s.setCreatedBy(issuedBy);
        return s;
    }
}
