package vn.dongthanh.vsmt.billing.domain;

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
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Một lần cán bộ xã điều chỉnh khoản theo biểu giá hoặc hủy khoản phải thu, kèm lý do (lịch sử trên chi tiết khoản). */
@Getter
@Entity
@Table(name = "charge_adjustments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChargeAdjustment extends BaseEntity {

    public enum Type {
        ADJUST,
        CANCEL
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "charge_id", nullable = false, updatable = false)
    private Charge charge;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private Type type;

    @Column(nullable = false, updatable = false)
    private long oldAmount;

    @Column(nullable = false, updatable = false)
    private long newAmount;

    @Column(nullable = false, updatable = false)
    private String reason;

    /** Nhóm giá và số lượng (nhân khẩu hoặc kg/tháng) trước / sau điều chỉnh; null với lần hủy hoặc nhóm không cần. */
    @Enumerated(EnumType.STRING)
    @Column(updatable = false, length = 30)
    private TariffGroup oldTariffGroup;

    @Enumerated(EnumType.STRING)
    @Column(updatable = false, length = 30)
    private TariffGroup newTariffGroup;

    @Column(updatable = false)
    private Long oldQuantity;

    @Column(updatable = false)
    private Long newQuantity;

    public static ChargeAdjustment of(Charge charge, Type type, long oldAmount, long newAmount, String reason,
            Long actorId) {
        ChargeAdjustment a = new ChargeAdjustment();
        a.charge = charge;
        a.type = type;
        a.oldAmount = oldAmount;
        a.newAmount = newAmount;
        a.reason = reason;
        a.setCreatedBy(actorId);
        return a;
    }

    /** Ghi kèm nhóm giá, số lượng trước / sau cho lần điều chỉnh theo biểu giá. */
    public ChargeAdjustment withTariff(TariffGroup oldGroup, Long oldQty, TariffGroup newGroup, Long newQty) {
        oldTariffGroup = oldGroup;
        oldQuantity = oldQty;
        newTariffGroup = newGroup;
        newQuantity = newQty;
        return this;
    }
}
