package vn.dongthanh.vsmt.collection.domain;

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
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Lượt ghé hộ không thu được (vắng, hẹn, từ chối). Không đổi trạng thái khoản. */
@Getter
@Entity
@Table(name = "collection_visits")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CollectionVisit extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "charge_id", nullable = false, updatable = false)
    private Charge charge;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private VisitResult result;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime visitedAt;

    private LocalDate revisitDate;

    @Column(length = 500)
    private String note;

    @Column(nullable = false, updatable = false)
    private Long recordedBy;

    @Column(nullable = false, updatable = false, length = 40)
    private String clientRequestId;

    public static CollectionVisit record(Charge charge, VisitResult result, OffsetDateTime visitedAt,
            LocalDate revisitDate, String note, Long recordedBy, String clientRequestId) {
        CollectionVisit v = new CollectionVisit();
        v.charge = charge;
        v.result = result;
        v.visitedAt = visitedAt;
        v.revisitDate = revisitDate;
        v.note = note;
        v.recordedBy = recordedBy;
        v.clientRequestId = clientRequestId;
        return v;
    }
}
