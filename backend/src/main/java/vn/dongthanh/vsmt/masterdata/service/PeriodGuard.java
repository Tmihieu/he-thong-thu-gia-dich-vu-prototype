package vn.dongthanh.vsmt.masterdata.service;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Chặn mọi thay đổi số liệu của kỳ đã khóa (T32): phát hành khoản, ghi thu, lượt ghé, lập phiếu thu
 * đều gọi {@link #requireOpen} trước khi ghi.
 */
public final class PeriodGuard {

    private PeriodGuard() {
    }

    public static void requireOpen(CollectionPeriod period) {
        if (period.getStatus() == PeriodStatus.LOCKED) {
            throw new BusinessRuleException("PERIOD_LOCKED", "Kỳ " + period.getCode() + " đã khóa, không thay đổi được.");
        }
    }
}
