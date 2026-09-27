package vn.dongthanh.vsmt.masterdata.domain;

import java.time.LocalTime;

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
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Một buổi thu gom lặp lại của khu vực: thứ (ISO 1–7), tuần trong tháng (null = hằng tuần), khung giờ, loại rác. */
@Getter
@Entity
@Table(name = "collection_schedules")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CollectionSchedule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    @Column(nullable = false)
    private int weekday;

    private Integer weekOfMonth;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private WasteType wasteType;

    private String note;

    public static CollectionSchedule create(Area area, int weekday, Integer weekOfMonth, LocalTime startTime,
            LocalTime endTime, WasteType wasteType, String note) {
        CollectionSchedule s = new CollectionSchedule();
        s.area = area;
        s.weekday = weekday;
        s.weekOfMonth = weekOfMonth;
        s.startTime = startTime;
        s.endTime = endTime;
        s.wasteType = wasteType;
        s.note = note;
        return s;
    }
}
