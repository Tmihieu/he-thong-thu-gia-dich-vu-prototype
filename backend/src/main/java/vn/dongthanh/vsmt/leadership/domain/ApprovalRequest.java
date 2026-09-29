package vn.dongthanh.vsmt.leadership.domain;

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
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.platform.common.BaseEntity;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Đề nghị về tiền do xã lập, lãnh đạo duyệt (SPEC §9.10). Mã {@code DN-MMYY-nnn}. Miễn giảm gắn hợp đồng; hoàn và
 * xóa nợ gắn khoản. Đã quyết thì không đổi nữa.
 */
@Getter
@Entity
@Table(name = "approval_requests")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalRequest extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private ApprovalType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", updatable = false)
    private ServiceContract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "charge_id", updatable = false)
    private Charge charge;

    @Column(updatable = false)
    private Long amount;

    @Column(nullable = false, updatable = false, length = 1000)
    private String reason;

    @Column(updatable = false, length = 50)
    private String decisionNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApprovalStatus status;

    @Column(nullable = false, updatable = false)
    private Long requestedBy;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime requestedAt;

    private Long decidedBy;

    private OffsetDateTime decidedAt;

    @Column(length = 1000)
    private String decisionNote;

    /** Kỳ ghi nhận trong sổ (hoàn / xóa nợ, O10). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "effective_period_id")
    private CollectionPeriod effectivePeriod;

    public static ApprovalRequest forContract(String code, ServiceContract contract, String reason, String decisionNo,
            Long requestedBy, OffsetDateTime at) {
        ApprovalRequest r = base(code, ApprovalType.EXEMPTION, reason, decisionNo, requestedBy, at);
        r.contract = contract;
        return r;
    }

    public static ApprovalRequest forCharge(String code, ApprovalType type, Charge charge, Long amount, String reason,
            String decisionNo, Long requestedBy, OffsetDateTime at) {
        ApprovalRequest r = base(code, type, reason, decisionNo, requestedBy, at);
        r.charge = charge;
        r.amount = amount;
        return r;
    }

    private static ApprovalRequest base(String code, ApprovalType type, String reason, String decisionNo,
            Long requestedBy, OffsetDateTime at) {
        ApprovalRequest r = new ApprovalRequest();
        r.code = code;
        r.type = type;
        r.reason = reason;
        r.decisionNo = decisionNo;
        r.status = ApprovalStatus.PENDING;
        r.requestedBy = requestedBy;
        r.requestedAt = at;
        return r;
    }

    public void approve(String note, CollectionPeriod effectivePeriod, Long by, OffsetDateTime at) {
        decide(ApprovalStatus.APPROVED, note, by, at);
        this.effectivePeriod = effectivePeriod;
    }

    public void reject(String note, Long by, OffsetDateTime at) {
        if (note == null || note.isBlank()) {
            throw new BusinessRuleException("APPROVAL_NOTE_REQUIRED", "Từ chối phải ghi ý kiến.");
        }
        decide(ApprovalStatus.REJECTED, note, by, at);
    }

    /** Chặn trước mọi thao tác kèm theo (xóa nợ, ghi hoàn) để lần duyệt thứ hai không chạm vào tiền. */
    public void requirePending() {
        if (status != ApprovalStatus.PENDING) {
            throw new BusinessRuleException("APPROVAL_ALREADY_DECIDED", "Đề nghị " + code + " đã được xử lý.");
        }
    }

    private void decide(ApprovalStatus result, String note, Long by, OffsetDateTime at) {
        requirePending();
        this.status = result;
        this.decisionNote = note == null || note.isBlank() ? null : note.trim();
        this.decidedBy = by;
        this.decidedAt = at;
    }
}
