package vn.dongthanh.vsmt.collection.domain;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Một giao dịch tiền vào SePay báo về: đã khớp với khoản thu (có thanh toán) hoặc chờ công ty đối chiếu. */
@Entity
@Table(name = "bank_transfers")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class BankTransfer {

    public enum Status {
        MATCHED,
        UNMATCHED
    }

    /** Lý do không tự ghi nhận được. */
    public enum Reason {
        /** Nội dung chuyển khoản không có mã khoản thu. */
        NO_CODE,
        CHARGE_NOT_FOUND,
        /** Tiền vào tài khoản không phải của công ty phụ trách khoản. */
        WRONG_ACCOUNT,
        AMOUNT_MISMATCH,
        /** Khoản đã thu đủ, được miễn, đã xóa nợ hoặc kỳ đã khóa. */
        CHARGE_NOT_COLLECTABLE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private long sepayId;

    private String gateway;
    private String accountNumber;
    private String transactionDate;

    @Column(nullable = false, updatable = false)
    private long amount;

    private String content;
    private String code;
    private String referenceCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private Reason reason;

    private Long chargeId;
    private Long paymentId;
    private Long companyId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
