package vn.dongthanh.vsmt.masterdata.domain;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Quy tắc tự tạo kỳ thu dự thảo, bảng chỉ có một dòng ({@link #ID}). Quản trị chỉ cấu hình ở đây; cán bộ xã là người
 * xem trước và mở kỳ.
 */
@Getter
@Entity
@Table(name = "period_auto_rule")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PeriodAutoRule {

    public static final int ID = 1;

    @Id
    private Integer id;

    @Column(nullable = false)
    private boolean enabled;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PeriodType periodType;

    /** Từ ngày này trong tháng thì tạo kỳ kế tiếp (kỳ quý: chỉ trong tháng cuối quý). */
    @Column(nullable = false)
    private int createDay;

    /** Hạn hộ đóng mặc định = ngày phát hành + số ngày này. */
    @Column(nullable = false)
    private int householdDueDays;

    /** Hạn công ty nộp xã = ngày cuối kỳ + số ngày này. */
    @Column(nullable = false)
    private int remitDueDays;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    private Long updatedBy;

    public void update(boolean enabled, PeriodType periodType, int createDay, int householdDueDays,
            int remitDueDays, OffsetDateTime at, Long by) {
        if (periodType == null) {
            throw new BusinessRuleException("PERIOD_RULE_INVALID", "Phải chọn chu kỳ kỳ thu (tháng hoặc quý).");
        }
        if (createDay < 1 || createDay > 28) {
            throw new BusinessRuleException("PERIOD_RULE_INVALID", "Ngày tạo kỳ phải từ 1 đến 28.");
        }
        if (householdDueDays < 1) {
            throw new BusinessRuleException("PERIOD_RULE_INVALID", "Số ngày hộ đóng phải từ 1 ngày trở lên.");
        }
        if (remitDueDays < 0) {
            throw new BusinessRuleException("PERIOD_RULE_INVALID", "Số ngày công ty nộp xã không được âm.");
        }
        this.enabled = enabled;
        this.periodType = periodType;
        this.createDay = createDay;
        this.householdDueDays = householdDueDays;
        this.remitDueDays = remitDueDays;
        this.updatedAt = at;
        this.updatedBy = by;
    }
}
