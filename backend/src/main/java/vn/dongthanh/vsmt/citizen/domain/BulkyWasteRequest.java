package vn.dongthanh.vsmt.citizen.domain;

import java.time.LocalDate;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.platform.common.BaseEntity;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Đăng ký thu gom rác cồng kềnh từ app người dân. Phí do công ty báo, không thành khoản phải thu (O5).
 * Vòng đời: PENDING → QUOTED → COLLECTED; hủy được khi PENDING hoặc QUOTED.
 */
@Getter
@Entity
@Table(name = "bulky_waste_requests")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BulkyWasteRequest extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "citizen_account_id", nullable = false, updatable = false)
    private CitizenAccount citizenAccount;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false, updatable = false)
    private ServiceSubject subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BulkyItemType itemType;

    private String itemDescription;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private LocalDate preferredDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DaySlot preferredSlot;

    private String photoUrls;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, updatable = false)
    private Company company;

    private Long quotedFee;

    private OffsetDateTime quotedAt;

    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BulkyStatus status;

    private OffsetDateTime collectedAt;

    private String cancelReason;

    @Builder
    private BulkyWasteRequest(String code, CitizenAccount citizenAccount, ServiceSubject subject, BulkyItemType itemType,
            String itemDescription, int quantity, String address, LocalDate preferredDate, DaySlot preferredSlot,
            String photoUrls, Company company) {
        this.code = code;
        this.citizenAccount = citizenAccount;
        this.subject = subject;
        this.itemType = itemType;
        this.itemDescription = itemDescription;
        this.quantity = quantity;
        this.address = address;
        this.preferredDate = preferredDate;
        this.preferredSlot = preferredSlot;
        this.photoUrls = photoUrls;
        this.company = company;
        this.status = BulkyStatus.PENDING;
    }

    /** Công ty báo phí (> 0) và ngày hẹn; chỉ từ Chờ xác nhận. */
    public void quote(long fee, LocalDate scheduledDate, OffsetDateTime at) {
        requireStatus(BulkyStatus.PENDING, "báo phí");
        if (fee <= 0) {
            throw new BusinessRuleException("BULKY_FEE_INVALID", "Phí thu gom phải lớn hơn 0.");
        }
        this.quotedFee = fee;
        this.quotedAt = at;
        this.scheduledDate = scheduledDate;
        this.status = BulkyStatus.QUOTED;
    }

    /** Công ty đánh dấu đã thu gom; chỉ sau khi đã báo phí. */
    public void markCollected(OffsetDateTime at) {
        requireStatus(BulkyStatus.QUOTED, "đánh dấu đã thu gom");
        this.collectedAt = at;
        this.status = BulkyStatus.COLLECTED;
    }

    public void cancel(String reason) {
        if (status == BulkyStatus.COLLECTED || status == BulkyStatus.CANCELLED) {
            throw new BusinessRuleException("BULKY_STATUS_INVALID",
                    "Yêu cầu " + code + " đã " + (status == BulkyStatus.COLLECTED ? "thu gom" : "hủy") + ", không hủy được.");
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleException("BULKY_CANCEL_REASON_REQUIRED", "Phải ghi lý do hủy.");
        }
        this.cancelReason = reason.trim();
        this.status = BulkyStatus.CANCELLED;
    }

    public void requireStatus(BulkyStatus expected, String action) {
        if (status != expected) {
            throw new BusinessRuleException("BULKY_STATUS_INVALID",
                    "Yêu cầu " + code + " đang ở trạng thái \"" + status.label() + "\", không " + action + " được.");
        }
    }
}
