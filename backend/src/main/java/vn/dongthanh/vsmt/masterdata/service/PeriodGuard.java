package vn.dongthanh.vsmt.masterdata.service;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Chặn mọi thay đổi số liệu của kỳ đã khóa (T32) hoặc chưa mở (Dự thảo): phát hành khoản, ghi thu, lượt ghé gọi
 * {@link #requireOpen} trước khi ghi.
 */
@Component
@RequiredArgsConstructor
public class PeriodGuard {

    private final CollectionPeriodRepository periods;

    /**
     * Đọc lại trạng thái kỳ từ CSDL kèm FOR SHARE, giữ tới hết transaction: khóa kỳ (FOR UPDATE) chờ các lượt ghi
     * đang chạy commit rồi mới đếm nợ; lượt ghi đến sau thì chờ khóa kỳ xong và thấy Đã khóa. Các lượt ghi không chặn
     * nhau. Không tin entity đã nạp: nó có thể cũ hơn CSDL.
     */
    public void requireOpen(CollectionPeriod period) {
        String status = periods.lockStatusForShare(period.getId());
        if (PeriodStatus.LOCKED.name().equals(status)) {
            throw locked(period);
        }
        if (PeriodStatus.DRAFT.name().equals(status)) {
            throw draft(period);
        }
    }

    /**
     * Kiểm trên entity đã nạp, không khóa: cho xem trước (transaction chỉ đọc không được FOR SHARE) hoặc khi dòng kỳ
     * đã được nạp bằng FOR UPDATE.
     */
    public static void requireOpenAsLoaded(CollectionPeriod period) {
        if (period.getStatus() == PeriodStatus.LOCKED) {
            throw locked(period);
        }
        if (period.getStatus() == PeriodStatus.DRAFT) {
            throw draft(period);
        }
    }

    private static BusinessRuleException draft(CollectionPeriod period) {
        return new BusinessRuleException("PERIOD_DRAFT",
                "Kỳ " + period.getCode() + " mới ở dạng dự thảo, cần mở kỳ trước.");
    }

    private static BusinessRuleException locked(CollectionPeriod period) {
        return new BusinessRuleException("PERIOD_LOCKED", "Kỳ " + period.getCode() + " đã khóa, không thay đổi được.");
    }
}
