package vn.dongthanh.vsmt.masterdata.domain;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;

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
import lombok.Setter;
import vn.dongthanh.vsmt.platform.common.BaseEntity;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Kỳ thu tháng ({@code 2026-10}) hoặc quý ({@code 2026-Q4}). Mã, tên và ngày đầu/cuối kỳ sinh từ loại + năm + số.
 * Trạng thái chỉ đi tới: COLLECTING (ngay khi mở) → LOCKED; kỳ tự tạo đi DRAFT → COLLECTING → LOCKED.
 */
@Getter
@Entity
@Table(name = "collection_periods")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CollectionPeriod extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 10)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private PeriodType periodType;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(nullable = false, updatable = false)
    private LocalDate startDate;

    @Column(nullable = false, updatable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private LocalDate openDate;

    @Column(nullable = false)
    private LocalDate dueDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tariff_version_id", nullable = false)
    private TariffVersion tariffVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PeriodStatus status;

    private OffsetDateTime lockedAt;

    private Long lockedBy;

    @Setter
    private String note;

    /**
     * @param number tháng 1–12 với {@link PeriodType#MONTH}, quý 1–4 với {@link PeriodType#QUARTER}
     * @param openDate null thì lấy ngày đầu kỳ
     */
    public static CollectionPeriod open(PeriodType type, int year, int number, LocalDate openDate, LocalDate dueDate,
            TariffVersion tariffVersion) {
        CollectionPeriod p = new CollectionPeriod();
        p.periodType = type;
        if (type == PeriodType.MONTH) {
            requireRange(number, 12, "Tháng");
            YearMonth ym = YearMonth.of(year, number);
            p.code = "%d-%02d".formatted(year, number);
            p.label = "Tháng %02d/%d".formatted(number, year);
            p.startDate = ym.atDay(1);
            p.endDate = ym.atEndOfMonth();
        } else {
            requireRange(number, 4, "Quý");
            YearMonth first = YearMonth.of(year, (number - 1) * 3 + 1);
            p.code = "%d-Q%d".formatted(year, number);
            p.label = "Quý %d/%d".formatted(number, year);
            p.startDate = first.atDay(1);
            p.endDate = first.plusMonths(2).atEndOfMonth();
        }
        p.openDate = openDate != null ? openDate : p.startDate;
        if (dueDate.isBefore(p.openDate)) {
            throw new BusinessRuleException("PERIOD_DUE_BEFORE_OPEN",
                    "Hạn công ty nộp xã không được trước ngày mở kỳ.");
        }
        p.dueDate = dueDate;
        p.tariffVersion = tariffVersion;
        p.status = PeriodStatus.COLLECTING;
        return p;
    }

    /** Kỳ dự thảo do hệ thống tự tạo: ngày mở lấy ngày đầu kỳ, chưa có khoản nào cho tới khi cán bộ xã mở kỳ. */
    public static CollectionPeriod draft(PeriodType type, int year, int number, LocalDate dueDate,
            TariffVersion tariffVersion) {
        CollectionPeriod p = open(type, year, number, null, dueDate, tariffVersion);
        p.status = PeriodStatus.DRAFT;
        return p;
    }

    /** Cán bộ xã mở kỳ dự thảo: chỉ từ Dự thảo, sang Đang thu. */
    public void publish() {
        requireStatus(PeriodStatus.DRAFT, PeriodStatus.COLLECTING);
        status = PeriodStatus.COLLECTING;
    }

    /** Cán bộ xã đặt ngày mở và hạn công ty nộp xã cho kỳ dự thảo trước khi mở. */
    public void schedule(LocalDate open, LocalDate due) {
        if (status != PeriodStatus.DRAFT) {
            throw new BusinessRuleException("PERIOD_SCHEDULE_LOCKED", "Kỳ " + code + " đã mở, không đổi ngày được.");
        }
        if (due.isBefore(open)) {
            throw new BusinessRuleException("PERIOD_DUE_BEFORE_OPEN", "Hạn công ty nộp xã không được trước ngày mở kỳ.");
        }
        openDate = open;
        dueDate = due;
    }

    /** Biểu giá có thể đổi sau khi dự thảo được tạo; kỳ dự thảo lấy lại biểu giá hiệu lực tại ngày đầu kỳ. */
    public void useTariff(TariffVersion version) {
        if (status != PeriodStatus.DRAFT) {
            throw new BusinessRuleException("PERIOD_TARIFF_LOCKED", "Kỳ " + code + " đã mở, không đổi biểu giá được.");
        }
        tariffVersion = version;
    }

    /** Cán bộ xã khóa kỳ (G1): chỉ từ Đang thu; sau khóa không phát hành, ghi thu, lập phiếu thu cho kỳ. */
    public void lock(OffsetDateTime at, Long by) {
        requireStatus(PeriodStatus.COLLECTING, PeriodStatus.LOCKED);
        status = PeriodStatus.LOCKED;
        lockedAt = at;
        lockedBy = by;
    }

    /** Phần kỳ trong mã chứng từ: tháng {@code MMYY} (1026), quý {@code Q{quý}{YY}} (Q426) (G11). */
    public String documentToken() {
        int yy = startDate.getYear() % 100;
        if (periodType == PeriodType.QUARTER) {
            return "Q%d%02d".formatted((startDate.getMonthValue() - 1) / 3 + 1, yy);
        }
        return "%02d%02d".formatted(startDate.getMonthValue(), yy);
    }

    public boolean covers(LocalDate date) {
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    private void requireStatus(PeriodStatus expected, PeriodStatus target) {
        if (status != expected) {
            throw new BusinessRuleException("PERIOD_INVALID_TRANSITION", "Kỳ " + code + " đang ở trạng thái \""
                    + status.label() + "\", không chuyển sang \"" + target.label() + "\" được.");
        }
    }

    private static void requireRange(int number, int max, String name) {
        if (number < 1 || number > max) {
            throw new BusinessRuleException("PERIOD_NUMBER_INVALID", name + " phải từ 1 đến " + max + ".");
        }
    }
}
