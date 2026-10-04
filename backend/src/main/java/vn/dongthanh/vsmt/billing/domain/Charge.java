package vn.dongthanh.vsmt.billing.domain;

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
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/**
 * Khoản phải thu của hộ, nguồn duy nhất cho "phải thu". Số tiền, đơn giá, khu vực và công ty chụp lúc phát hành;
 * không sửa số tiền sau khi phát hành (số thực thu nằm ở Payment, G4).
 */
@Getter
@Entity
@Table(name = "charges")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Charge extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "charge_request_id", nullable = false, updatable = false)
    private ChargeRequest chargeRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false, updatable = false)
    private ServiceSubject subject;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false, updatable = false)
    private ServiceContract contract;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false, updatable = false)
    private CollectionPeriod period;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fee_type_id", nullable = false, updatable = false)
    private FeeType feeType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false, updatable = false)
    private Area area;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, updatable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(updatable = false, length = 30)
    private TariffGroup tariffGroup;

    @Column(nullable = false, updatable = false)
    private long unitPrice;

    @Column(nullable = false, updatable = false)
    private int months;

    /** Chỉ đổi khi lãnh đạo từ chối miễn giảm (khoản Miễn giảm về Chưa thu, O8). */
    @Column(nullable = false)
    private long amount;

    @Column(nullable = false, updatable = false)
    private LocalDate coverageFrom;

    @Column(nullable = false, updatable = false)
    private LocalDate coverageTo;

    /** Phần thu gom công ty giữ lại, chụp lúc phát hành; phần vận chuyển nộp xã = số tiền − phần này (xã chốt 03/10). */
    @Column(nullable = false, updatable = false)
    private long collectionAmount;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ChargeStatus status;

    private OffsetDateTime paidAt;

    /** Kỳ ghi nhận xóa nợ (T57): kỳ của khoản nếu chưa khóa, ngược lại kỳ đang thu lúc duyệt (O10). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "written_off_period_id")
    private CollectionPeriod writtenOffPeriod;

    public static Charge issue(String code, ChargeRequest request, ServiceSubject subject, ServiceContract contract,
            Company company, ChargeAmount amount) {
        Charge c = new Charge();
        c.code = code;
        c.chargeRequest = request;
        c.subject = subject;
        c.contract = contract;
        c.period = request.getPeriod();
        c.feeType = request.getFeeType();
        c.area = subject.getArea();
        c.company = company;
        c.tariffGroup = amount.tariffGroup();
        c.unitPrice = amount.unitPrice();
        c.months = amount.months();
        c.amount = amount.amount();
        c.collectionAmount = amount.collectionAmount();
        c.coverageFrom = request.getPeriod().getStartDate();
        c.coverageTo = request.getPeriod().getEndDate();
        c.dueDate = request.getDueDate();
        c.status = amount.exempt() ? ChargeStatus.EXEMPT : ChargeStatus.UNPAID;
        return c;
    }

    /** Đã thu đủ: chuyển sang Đã thu. Chỉ gọi khi tổng thanh toán bằng số tiền khoản (G4). */
    public void markPaid(OffsetDateTime at) {
        if (status != ChargeStatus.UNPAID) {
            throw new IllegalStateException("Khoản " + code + " không ở trạng thái chưa thu");
        }
        status = ChargeStatus.PAID;
        paidAt = at;
    }

    /** Hoàn hết số đã thu (T58): Đã thu → Chưa thu. */
    public void markUnpaidAfterRefund() {
        if (status != ChargeStatus.PAID) {
            throw new IllegalStateException("Khoản " + code + " không ở trạng thái đã thu");
        }
        status = ChargeStatus.UNPAID;
        paidAt = null;
    }

    /** Xóa nợ đã được duyệt (T57): chỉ khoản Chưa thu. */
    public void writeOff(CollectionPeriod ledgerPeriod) {
        if (status != ChargeStatus.UNPAID) {
            throw new IllegalStateException("Khoản " + code + " không ở trạng thái chưa thu");
        }
        status = ChargeStatus.WRITTEN_OFF;
        writtenOffPeriod = ledgerPeriod;
    }

    /** Lãnh đạo từ chối miễn giảm (O8): khoản Miễn giảm về Chưa thu, số tiền tính lại theo đơn giá đã chụp. */
    public void revokeExemption() {
        if (status != ChargeStatus.EXEMPT) {
            throw new IllegalStateException("Khoản " + code + " không ở trạng thái miễn giảm");
        }
        status = ChargeStatus.UNPAID;
        amount = Math.multiplyExact(unitPrice, (long) months);
    }

    /** Quá hạn: chưa thu và đã qua hạn đóng (không lưu, tính khi đọc). */
    public boolean isOverdue(LocalDate today) {
        return status == ChargeStatus.UNPAID && dueDate.isBefore(today);
    }
}
