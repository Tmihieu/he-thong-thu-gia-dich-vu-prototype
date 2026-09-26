package vn.dongthanh.vsmt.billing.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Quy tắc R2, đối tượng nào được lập khoản (không đụng CSDL). Xét lần lượt: đang cung cấp dịch vụ →
 * có hợp đồng hiệu lực tại ngày phát hành → khu vực đã có công ty tại ngày phát hành (G3) → chưa có khoản
 * cùng loại phí ở kỳ chồng lấn (tháng nằm trong quý và ngược lại). Chỉ lập khoản cho kỳ chưa khóa.
 */
@Component
public class ChargeEligibility {

    static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public enum SkipReason {
        SUBJECT_NOT_ACTIVE(false),
        NO_ACTIVE_CONTRACT(false),
        /** Cảnh báo: cán bộ xã cần phân công khu vực rồi lập lại. */
        AREA_WITHOUT_COMPANY(true),
        DUPLICATE_CHARGE(false);

        private final boolean warning;

        SkipReason(boolean warning) {
            this.warning = warning;
        }

        public boolean warning() {
            return warning;
        }
    }

    /** Khoảng tháng đã được lập khoản (cùng đối tượng, cùng loại phí). */
    public record Coverage(LocalDate from, LocalDate to) {
    }

    public sealed interface Decision permits Eligible, Skipped {
    }

    public record Eligible(ServiceContract contract, Long companyId) implements Decision {
    }

    public record Skipped(SkipReason reason, String message) implements Decision {
    }

    /**
     * @param contracts         mọi hợp đồng của đối tượng
     * @param companyIdOnIssue  công ty phụ trách khu vực của đối tượng tại ngày phát hành; null nếu chưa có
     * @param existingSameFee   các khoảng đã lập khoản cùng loại phí cho đối tượng
     */
    public Decision decide(ServiceSubject subject, List<ServiceContract> contracts, Long companyIdOnIssue,
            List<Coverage> existingSameFee, CollectionPeriod period, LocalDate issueDate) {
        if (subject.getStatus() != SubjectStatus.ACTIVE) {
            return new Skipped(SkipReason.SUBJECT_NOT_ACTIVE, "Đối tượng không ở trạng thái đang cung cấp dịch vụ.");
        }
        Optional<ServiceContract> contract = contracts.stream().filter(c -> c.covers(issueDate)).findFirst();
        if (contract.isEmpty()) {
            return new Skipped(SkipReason.NO_ACTIVE_CONTRACT,
                    "Không có hợp đồng hiệu lực vào ngày " + VN_DATE.format(issueDate) + ".");
        }
        if (companyIdOnIssue == null) {
            return new Skipped(SkipReason.AREA_WITHOUT_COMPANY,
                    "Khu vực " + subject.getArea().getCode() + " chưa có công ty phụ trách.");
        }
        boolean duplicate = existingSameFee.stream()
                .anyMatch(c -> !c.from().isAfter(period.getEndDate()) && !c.to().isBefore(period.getStartDate()));
        if (duplicate) {
            return new Skipped(SkipReason.DUPLICATE_CHARGE, "Đã có khoản cùng loại phí trùng thời gian kỳ "
                    + period.getCode() + ".");
        }
        return new Eligible(contract.get(), companyIdOnIssue);
    }

    /** Chặn lập khoản cho kỳ đã khóa. */
    public static void requireBillable(CollectionPeriod period) {
        if (period.getStatus() == PeriodStatus.LOCKED) {
            throw new BusinessRuleException("PERIOD_LOCKED", "Kỳ " + period.getCode() + " đã khóa, không lập khoản được.");
        }
    }
}
