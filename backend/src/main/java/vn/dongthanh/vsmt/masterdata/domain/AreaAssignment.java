package vn.dongthanh.vsmt.masterdata.domain;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Phân công khu vực cho công ty trong một khoảng hiệu lực; lịch sử giữ nguyên, không xóa. */
@Getter
@Entity
@Table(name = "area_assignments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AreaAssignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false, updatable = false)
    private Area area;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, updatable = false)
    private Company company;

    @Column(nullable = false, updatable = false)
    private LocalDate validFrom;

    private LocalDate validTo;

    private String note;

    @Column(length = 50)
    private String decisionNo;

    public static AreaAssignment create(Area area, Company company, LocalDate validFrom, String note,
            String decisionNo) {
        AreaAssignment a = new AreaAssignment();
        a.area = area;
        a.company = company;
        a.validFrom = validFrom;
        a.note = note;
        a.decisionNo = decisionNo;
        return a;
    }

    public boolean covers(LocalDate date) {
        return !date.isBefore(validFrom) && (validTo == null || !date.isAfter(validTo));
    }

    /** Kết thúc hiệu lực vào ngày {@code lastDay} (tính cả ngày đó). */
    public void closeOn(LocalDate lastDay) {
        if (lastDay.isBefore(validFrom)) {
            throw new IllegalArgumentException("Ngày kết thúc trước ngày bắt đầu phân công");
        }
        this.validTo = lastDay;
    }
}
