package vn.dongthanh.vsmt.collection.domain;

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
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.platform.common.BaseEntity;
import vn.dongthanh.vsmt.platform.domain.User;

/** Phân tổ cho người đi thu (công ty lập). Công ty lấy từ người lập, không nhận từ client. */
@Getter
@Entity
@Table(name = "collector_assignments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CollectorAssignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "collector_id", nullable = false, updatable = false)
    private User collector;

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

    public static CollectorAssignment create(User collector, Area area, Company company, LocalDate validFrom,
            String note, Long createdBy) {
        CollectorAssignment a = new CollectorAssignment();
        a.collector = collector;
        a.area = area;
        a.company = company;
        a.validFrom = validFrom;
        a.note = note;
        a.setCreatedBy(createdBy);
        return a;
    }

    public boolean covers(LocalDate date) {
        return !date.isBefore(validFrom) && (validTo == null || !date.isAfter(validTo));
    }

    /** Kết thúc hiệu lực vào ngày {@code lastDay}; phân tổ bắt đầu sau ngày đó thì kết thúc ngay ngày bắt đầu. */
    public void closeOn(LocalDate lastDay) {
        if (validTo == null || validTo.isAfter(lastDay)) {
            validTo = lastDay.isBefore(validFrom) ? validFrom : lastDay;
        }
    }
}
