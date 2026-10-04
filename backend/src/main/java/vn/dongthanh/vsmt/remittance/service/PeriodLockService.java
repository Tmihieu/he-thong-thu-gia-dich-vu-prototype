package vn.dongthanh.vsmt.remittance.service;

import java.util.List;
import java.util.stream.Collectors;

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
 * Khóa kỳ (cán bộ xã, G1): chặn khi còn bất kỳ công ty nào phải thu − đã nộp &gt; 0 cho kỳ, không cần quá hạn
 * (G15, R19); lỗi liệt kê công ty và số còn nợ. Khóa dòng kỳ trong transaction để không có phiếu thu/khoản mới
 * chen vào giữa lúc kiểm tra và lúc khóa.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PeriodLockService {

    private final CollectionPeriodRepository periods;
    private final CompanyLedgerService ledger;
    private final PeriodService periodService;

    public CollectionPeriod lock(Long periodId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        CollectionPeriod period = periods.findByIdForUpdate(periodId)
                .orElseThrow(() -> new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu."));
        if (period.getStatus() != PeriodStatus.COLLECTING) {
            throw new BusinessRuleException("PERIOD_INVALID_TRANSITION", "Chỉ khóa được kỳ đang thu; kỳ " + period.getCode()
                    + " đang ở trạng thái \"" + period.getStatus().label() + "\".");
        }
        List<LedgerRow> debts = ledger.companiesWithDebt(periodId);
        if (!debts.isEmpty()) {
            String detail = debts.stream().map(r -> r.companyCode() + ": " + Money.format(r.remaining()))
                    .collect(Collectors.joining("; "));
            throw new BusinessRuleException("PERIOD_HAS_DEBT", "Chưa khóa được kỳ " + period.getCode() + " vì còn "
                    + debts.size() + " công ty chưa nộp đủ: " + detail + ".");
        }
        return periodService.markLocked(period, actor);
    }
}
