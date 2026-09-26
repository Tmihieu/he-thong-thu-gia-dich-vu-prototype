package vn.dongthanh.vsmt.remittance.domain;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Nhắc nộp cho công ty có nợ quá hạn (R16). Giữ lịch sử, không xóa (D6). */
@Getter
@Entity
@Table(name = "payment_reminders")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentReminder extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, updatable = false)
    private Company company;

    @Column(nullable = false, updatable = false)
    private LocalDate reminderDate;

    @Column(nullable = false, updatable = false)
    private LocalDate dueDate;

    @ManyToMany
    @OrderBy("startDate")
    @JoinTable(name = "payment_reminder_periods", joinColumns = @JoinColumn(name = "reminder_id"),
            inverseJoinColumns = @JoinColumn(name = "period_id"))
    private List<CollectionPeriod> periods = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private long amount;

    @Column(nullable = false, updatable = false, length = 2000)
    private String content;

    public static PaymentReminder create(String code, Company company, LocalDate reminderDate, LocalDate dueDate,
            List<CollectionPeriod> periods, long amount, String content, Long createdBy) {
        PaymentReminder r = new PaymentReminder();
        r.code = code;
        r.company = company;
        r.reminderDate = reminderDate;
        r.dueDate = dueDate;
        r.periods.addAll(periods);
        r.amount = amount;
        r.content = content;
        r.setCreatedBy(createdBy);
        return r;
    }
}
