package vn.dongthanh.vsmt.remittance.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.HouseholdDebtRow;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.HouseholdDebtTotals;

/**
 * Công nợ hộ (UC-32, UC-39): các khoản Chưa thu của kỳ đã khóa. Không có bảng riêng: hộ nộp ở kỳ sau thì khoản thành Đã
 * thu và hết nợ. Chỉ cán bộ xã và lãnh đạo xem; công ty không xem tổng hợp này.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HouseholdDebtService {

    public record HouseholdDebtPage(List<HouseholdDebtRow> items, HouseholdDebtTotals totals, int page, int size) {
    }

    private final LedgerQueries queries;

    /** Tổng (số hộ, số khoản, tiền) và một trang khoản nợ, lọc tùy chọn theo công ty, tổ. */
    public HouseholdDebtPage list(Long companyId, Long areaId, int page, int size, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.LEADER);
        return new HouseholdDebtPage(queries.householdDebts(companyId, areaId, size, (long) page * size),
                queries.householdDebtTotals(companyId, areaId), page, size);
    }
}
