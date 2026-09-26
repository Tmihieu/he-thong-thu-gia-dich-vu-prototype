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
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.platform.common.BaseEntity;
import vn.dongthanh.vsmt.platform.domain.User;

/** Người đi thu nộp tiền mặt cho công ty; quản lý công ty ghi khi nhận (G5). Không gắn kỳ (D5). */
@Getter
@Entity
@Table(name = "cash_handovers")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CashHandover extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "collector_id", nullable = false, updatable = false)
    private User collector;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, updatable = false)
    private Company company;

    @Column(nullable = false, updatable = false)
    private LocalDate handoverDate;

    @Column(nullable = false, updatable = false)
    private long amount;

    @Column(length = 500)
    private String note;

    @Column(nullable = false, updatable = false)
    private Long receivedBy;

    public static CashHandover receive(String code, User collector, Company company, LocalDate date, long amount,
            String note, Long receivedBy) {
        CashHandover h = new CashHandover();
        h.code = code;
        h.collector = collector;
        h.company = company;
        h.handoverDate = date;
        h.amount = amount;
        h.note = note;
        h.receivedBy = receivedBy;
        return h;
    }
}
