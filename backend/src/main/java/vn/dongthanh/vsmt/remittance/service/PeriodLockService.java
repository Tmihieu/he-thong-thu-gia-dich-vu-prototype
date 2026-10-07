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
 * Khóa kỳ (cán bộ xã, G1; UC-39, 07/10): chỉ khóa khi không còn chuyển khoản chưa xác định công ty và mọi công ty có số
 * liệu trong kỳ đã có phiếu quyết toán (phiếu chỉ lập được sau hạn dân đóng). Không thì chặn và nêu lý do. Khoản hộ chưa
 * đóng lúc khóa thành công nợ của hộ, hộ nộp được ở kỳ sau và tiền tính vào kỳ đang thu. Khóa dòng kỳ trong transaction để
 * không có phiếu / khoản mới chen vào giữa lúc kiểm tra và lúc khóa.
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
        var qr = ledger.unidentifiedQr();
        if (qr.count() > 0) {
            throw new BusinessRuleException("PERIOD_UNIDENTIFIED_QR", "Chưa khóa được kỳ " + period.getCode() + " vì còn "
                    + qr.count() + " giao dịch chuyển khoản chưa xác định công ty (" + Money.format(qr.amount()) + ").");
        }
        List<LedgerRow> unsettled = ledger.unsettled(periodId);
        if (!unsettled.isEmpty()) {
            String detail = unsettled.stream().map(LedgerRow::companyCode).collect(Collectors.joining(", "));
            throw new BusinessRuleException("PERIOD_NOT_SETTLED", "Chưa khóa được kỳ " + period.getCode() + " vì còn "
                    + unsettled.size() + " công ty chưa quyết toán: " + detail + ".");
        }
        return periodService.markLocked(period, actor);
    }
}
