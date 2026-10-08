package vn.dongthanh.vsmt.remittance.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.service.PeriodService;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService.LedgerRow;

/**
 * Khóa kỳ (cán bộ xã, G1; UC-39, góp ý BA 05/10): chỉ khóa khi mọi công ty đã nộp đủ phải nộp xã (tính trên số đã thu)
 * VÀ xã đã trả đủ mọi khoản phải trả lại công ty (phiếu chi trả, UC-55) VÀ (kỳ đã thu đủ mọi khoản HOẶC đã đến hạn nộp của kỳ). Không thì chặn và nêu lý do; lỗi liệt kê công ty và số còn
 * nợ. Khoản hộ chưa đóng lúc khóa thành công nợ của hộ (không cần ghi gì thêm: là khoản Chưa thu của kỳ đã khóa), hộ
 * nộp được ở kỳ sau và tiền tính vào kỳ đang thu. Khóa dòng kỳ trong transaction để không có phiếu thu/khoản mới chen
 * vào giữa lúc kiểm tra và lúc khóa.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PeriodLockService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final CollectionPeriodRepository periods;
    private final CompanyLedgerService ledger;
    private final PeriodService periodService;
    private final Clock clock;

    public CollectionPeriod lock(Long periodId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        CollectionPeriod period = periods.findByIdForUpdate(periodId)
                .orElseThrow(() -> new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu."));
        if (period.getStatus() != PeriodStatus.COLLECTING) {
            throw new BusinessRuleException("PERIOD_INVALID_TRANSITION", "Chỉ khóa được kỳ đang thu; kỳ " + period.getCode()
                    + " đang ở trạng thái \"" + period.getStatus().label() + "\".");
        }
        List<LedgerRow> debts = ledger.companiesWithDebt(periodId);
        String debtReason = null;
        if (!debts.isEmpty()) {
            String detail = debts.stream().map(r -> r.companyCode() + ": " + Money.format(r.remaining()))
                    .collect(Collectors.joining("; "));
            debtReason = "còn " + debts.size() + " công ty chưa nộp đủ phải nộp xã: " + detail;
        }
        var qr = ledger.unidentifiedQr();
        if (qr.count() > 0) {
            throw new BusinessRuleException("PERIOD_UNIDENTIFIED_QR", "Chưa khóa được kỳ " + period.getCode() + " vì còn "
                    + qr.count() + " giao dịch chuyển khoản chưa xác định công ty (" + Money.format(qr.amount()) + ").");
        }
        long unpaid = ledger.unpaidChargeCount(periodId);
        // "Đã đến hạn nộp": hôm nay đã tới ngày hạn nộp của kỳ (không đợi qua hạn).
        boolean due = !LocalDate.now(clock).isBefore(period.getDueDate());
        String collectReason = null;
        if (unpaid > 0 && !due) {
            collectReason = "còn " + unpaid + " khoản hộ chưa đóng và chưa đến hạn nộp ("
                    + period.getDueDate().format(DATE) + ")";
        }
        if (debtReason != null || collectReason != null) {
            String reason = Stream.of(debtReason, collectReason).filter(Objects::nonNull).collect(Collectors.joining("; "));
            throw new BusinessRuleException(debtReason != null ? "PERIOD_HAS_DEBT" : "PERIOD_NOT_DUE",
                    "Chưa khóa được kỳ " + period.getCode() + " vì " + reason + ".");
        }
        return periodService.markLocked(period, actor);
    }
}
