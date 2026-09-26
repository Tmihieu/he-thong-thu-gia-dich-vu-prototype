package vn.dongthanh.vsmt.remittance.service;

import java.time.LocalDate;
import java.util.List;

/** Truy vấn tổng hợp cho sổ công ty–kỳ (tính bằng SQL, không nạp từng khoản vào bộ nhớ). */
public interface LedgerQueries {

    record CompanyAmount(long companyId, long amount, long count) {
    }

    record CompanyPeriodAmount(long companyId, long periodId, long amount) {
    }

    /** Phải thu: Σ số tiền khoản theo công ty chụp lúc phát hành (G3), kèm số khoản. */
    List<CompanyAmount> dueByCompany(long periodId);

    /** Công ty đã thu: Σ thanh toán của các khoản trong kỳ (G4, R8), kèm số lần thanh toán. */
    List<CompanyAmount> collectedByCompany(long periodId);

    /** Tiến độ theo tổ của một kỳ: công ty chụp trên khoản, phải thu, đã thu, số khoản, số khoản đã thu đủ. */
    record AreaProgressRow(long areaId, long companyId, long due, long collected, long chargeCount, long paidCount) {
    }

    List<AreaProgressRow> progressByArea(long periodId);

    /** Phải thu theo (công ty, kỳ) của các kỳ có hạn công ty nộp xã trước {@code today}. */
    List<CompanyPeriodAmount> dueByCompanyAndPeriodBefore(LocalDate today);
}
