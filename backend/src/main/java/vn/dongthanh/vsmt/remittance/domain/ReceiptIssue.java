package vn.dongthanh.vsmt.remittance.domain;

import java.time.OffsetDateTime;

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
import vn.dongthanh.vsmt.platform.common.BaseEntity;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/** Công ty báo sai sót một phiếu thu; xã đóng kèm ghi chú kết quả (G6), không sửa phiếu. */
@Getter
@Entity
@Table(name = "receipt_issues")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReceiptIssue extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receipt_id", nullable = false, updatable = false)
    private CompanyReceipt receipt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private ReceiptIssueType issueType;

    @Column(updatable = false)
    private Long correctAmount;

    @Column(nullable = false, updatable = false, length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReceiptIssueStatus status;

    @Column(nullable = false, updatable = false)
    private Long reportedBy;

    private Long resolvedBy;

    private OffsetDateTime resolvedAt;

    @Column(length = 1000)
    private String resolutionNote;

    public static ReceiptIssue report(CompanyReceipt receipt, ReceiptIssueType type, Long correctAmount,
            String description, Long reportedBy) {
        ReceiptIssue i = new ReceiptIssue();
        i.receipt = receipt;
        i.issueType = type;
        i.correctAmount = correctAmount;
        i.description = description;
        i.status = ReceiptIssueStatus.PENDING;
        i.reportedBy = reportedBy;
        return i;
    }

    public void resolve(String note, Long by, OffsetDateTime at) {
        if (status != ReceiptIssueStatus.PENDING) {
            throw new BusinessRuleException("RECEIPT_ISSUE_ALREADY_RESOLVED", "Sai sót này đã được xử lý.");
        }
        if (note == null || note.isBlank()) {
            throw new BusinessRuleException("RESOLUTION_NOTE_REQUIRED", "Phải ghi kết quả xử lý.");
        }
        status = ReceiptIssueStatus.RESOLVED;
        resolutionNote = note.trim();
        resolvedBy = by;
        resolvedAt = at;
    }
}
