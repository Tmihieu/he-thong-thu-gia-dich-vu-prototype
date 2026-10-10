package vn.dongthanh.vsmt.billing.domain;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Objects;

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
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
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
    /** Nhóm giá, đơn giá, định mức, nhân khẩu: chụp lúc phát hành; chỉ đổi khi cán bộ xã điều chỉnh theo biểu giá. */
    @Column(length = 30)
    private TariffGroup tariffGroup;

    @Column(nullable = false)
    private long unitPrice;

    @Column(nullable = false, updatable = false)
    private int months;

    /** Định mức kg/tháng chụp lúc phát hành (nhóm theo ký); null nếu không áp dụng. Cần để tính lại tiền khi bỏ miễn giảm. */
    private Long quotaKg;

    /** Số nhân khẩu chụp lúc phát hành (nhóm theo nhân khẩu); null nếu không áp dụng. */
    private Integer memberCount;

    /** Chỉ đổi khi lãnh đạo từ chối miễn giảm (khoản Miễn giảm về Chưa thu, O8). */
    @Column(nullable = false)
    private long amount;

    @Column(nullable = false, updatable = false)
    private LocalDate coverageFrom;

    @Column(nullable = false, updatable = false)
    private LocalDate coverageTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ChargeStatus status;

    private OffsetDateTime paidAt;

    /** Kỳ ghi nhận xóa nợ (T57): kỳ của khoản nếu chưa khóa, ngược lại kỳ đang thu lúc duyệt (O10). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "written_off_period_id")
    private CollectionPeriod writtenOffPeriod;

    /** Lý do cán bộ xã hủy khoản; chỉ có khi Đã hủy. */
    private String cancelReason;

    private OffsetDateTime cancelledAt;

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
        c.quotaKg = amount.quotaKg();
        c.memberCount = amount.memberCount();
        c.amount = amount.amount();
        c.coverageFrom = request.getPeriod().getStartDate();
        c.coverageTo = request.getPeriod().getEndDate();
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
    public void revokeExemption(Number contractQuotaKg) {
        if (status != ChargeStatus.EXEMPT) {
            throw new IllegalStateException("Khoản " + code + " không ở trạng thái miễn giảm");
        }
        long quantity = 1;
        if (tariffGroup == TariffGroup.HH_PER_CAPITA) {
            quantity = memberCount; // luôn chụp khi lập khoản theo nhân khẩu
        } else if (tariffGroup != null && tariffGroup.isPerKg()) {
            // Nhóm theo ký: đơn giá là đ/kg nên phải nhân định mức (đã chụp, hoặc định mức hiện tại của đăng ký nếu hộ miễn chưa có).
            Number quota = quotaKg != null ? quotaKg : contractQuotaKg;
            if (quota == null) {
                throw new BusinessRuleException("QUOTA_KG_REQUIRED",
                        "Đăng ký thu phí nhóm tính theo ký chưa có định mức kg/tháng; nhập định mức trước khi từ chối miễn giảm.");
            }
            quantity = quota.longValue();
        }
        status = ChargeStatus.UNPAID;
        amount = Math.multiplyExact(Math.multiplyExact(unitPrice, quantity), (long) months);
    }

    /** Khoản lập sai phí còn sửa được: Chưa thu hoặc Miễn giảm (người gọi kiểm chưa có lần thu nào, kỳ chưa khóa). */
    public boolean isCorrectable() {
        return status == ChargeStatus.UNPAID || status == ChargeStatus.EXEMPT;
    }

    /**
     * Cán bộ xã điều chỉnh khoản Chưa thu lập sai phí theo biểu giá của kỳ: nhóm giá, đơn giá tháng của nhóm đó và số
     * lượng (nhân khẩu với nhóm theo nhân khẩu, định mức kg/tháng với nhóm theo ký); số tiền tính lại, giữ số tháng.
     */
    public void reprice(TariffGroup group, long monthlyRate, Integer members, Long kg) {
        if (status != ChargeStatus.UNPAID) {
            throw new BusinessRuleException("CHARGE_NOT_ADJUSTABLE",
                    "Chỉ điều chỉnh khoản đang ở trạng thái chưa thu (" + code + ").");
        }
        if (tariffGroup == null) {
            throw new BusinessRuleException("CHARGE_NOT_TARIFF",
                    "Khoản " + code + " là phí giá cố định, không điều chỉnh theo biểu giá; hủy và lập lại nếu sai.");
        }
        long quantity = 1;
        Integer newMembers = null;
        Long newKg = null;
        if (group == TariffGroup.HH_PER_CAPITA) {
            if (members == null || members <= 0) {
                throw new BusinessRuleException("MEMBER_COUNT_REQUIRED", "Nhóm theo nhân khẩu phải nhập số nhân khẩu lớn hơn 0.");
            }
            newMembers = members;
            quantity = members;
        } else if (group.isPerKg()) {
            if (kg == null || kg <= 0) {
                throw new BusinessRuleException("QUOTA_KG_REQUIRED", "Nhóm tính theo ký phải nhập định mức kg/tháng lớn hơn 0.");
            }
            newKg = kg;
            quantity = kg;
        }
        if (group == tariffGroup && monthlyRate == unitPrice && Objects.equals(newMembers, memberCount)
                && Objects.equals(newKg, quotaKg)) {
            throw new BusinessRuleException("CHARGE_UNCHANGED", "Nhóm giá và số lượng không thay đổi so với khoản hiện tại.");
        }
        long newAmount = Math.multiplyExact(Math.multiplyExact(monthlyRate, quantity), (long) months);
        if (newAmount <= 0) {
            throw new BusinessRuleException("CHARGE_AMOUNT_INVALID", "Số tiền sau điều chỉnh phải lớn hơn 0.");
        }
        tariffGroup = group;
        unitPrice = monthlyRate;
        memberCount = newMembers;
        quotaKg = newKg;
        amount = newAmount;
    }

    /** Cán bộ xã hủy khoản lập sai: không còn tính phải thu, không thu được nữa. */
    public void cancel(String reason, OffsetDateTime at) {
        if (!isCorrectable()) {
            throw new BusinessRuleException("CHARGE_NOT_CANCELLABLE",
                    "Chỉ hủy khoản chưa thu hoặc miễn giảm (" + code + ").");
        }
        status = ChargeStatus.CANCELLED;
        cancelReason = reason;
        cancelledAt = at;
    }

    /** Quá hạn: chưa thu và đã qua hạn nộp của kỳ (không lưu, tính khi đọc). */
    public boolean isOverdue(LocalDate today) {
        return status == ChargeStatus.UNPAID && period.getDueDate().isBefore(today);
    }
}
