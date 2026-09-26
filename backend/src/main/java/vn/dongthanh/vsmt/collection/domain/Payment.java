package vn.dongthanh.vsmt.collection.domain;

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
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/**
 * Một lần thu tiền cho một khoản (G4: được thu nhiều lần). Mã {@code TT-MMYY-nnnnnn} ổn định (D4), không phải
 * biên lai pháp lý (O1). {@code collectorId} là người đang giữ tiền mặt (R21).
 */
@Getter
@Entity
@Table(name = "payments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "charge_id", nullable = false, updatable = false)
    private Charge charge;

    @Column(nullable = false, updatable = false)
    private long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private PaymentMethod method;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime paidAt;

    @Column(updatable = false)
    private Long collectorId;

    @Column(updatable = false)
    private Long confirmedBy;

    @Column(updatable = false)
    private Long citizenAccountId;

    @Column(length = 50)
    private String bankRef;

    @Column(length = 500)
    private String note;

    @Column(nullable = false, updatable = false, length = 40)
    private String clientRequestId;

    @Builder
    private static Payment of(String code, Charge charge, long amount, PaymentMethod method, OffsetDateTime paidAt,
            Long collectorId, Long confirmedBy, Long citizenAccountId, String bankRef, String note,
            String clientRequestId) {
        Payment p = new Payment();
        p.code = code;
        p.charge = charge;
        p.amount = amount;
        p.method = method;
        p.paidAt = paidAt;
        p.collectorId = collectorId;
        p.confirmedBy = confirmedBy;
        p.citizenAccountId = citizenAccountId;
        p.bankRef = bankRef;
        p.note = note;
        p.clientRequestId = clientRequestId;
        return p;
    }
}
