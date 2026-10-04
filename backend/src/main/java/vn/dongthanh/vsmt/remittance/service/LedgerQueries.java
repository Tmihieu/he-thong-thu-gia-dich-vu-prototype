package vn.dongthanh.vsmt.remittance.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

/** Truy vấn tổng hợp cho sổ công ty–kỳ (tính bằng SQL, không nạp từng khoản vào bộ nhớ). */
@Repository
@RequiredArgsConstructor
public class LedgerQueries {

    public record CompanyAmount(long companyId, long amount, long count) {
    }

    public record CompanyPeriodAmount(long companyId, long periodId, long amount) {
    }

    /** Tiến độ theo tổ của một kỳ: công ty chụp trên khoản, phải thu, đã thu, số khoản, số khoản đã thu đủ. */
    public record AreaProgressRow(long areaId, long companyId, long due, long collected, long chargeCount, long paidCount, long exemptCount) {
    }

    private final JdbcTemplate jdbc;

    /** Khoản còn tính phải thu ở kỳ của nó: bỏ khoản đã xóa nợ ghi nhận ngay trong kỳ đó (T57). */
    private static final String COUNTED = "not (c.status = 'WRITTEN_OFF' and c.written_off_period_id = c.period_id)";

    /** Kỳ ghi nhận của một thanh toán: hoàn tiền có kỳ riêng (T58, O10), còn lại là kỳ của khoản. */
    private static final String PAYMENT_PERIOD = "coalesce(p.ledger_period_id, c.period_id)";

    /** Phải thu: Σ số tiền khoản theo công ty chụp lúc phát hành (G3), kèm số khoản. */
    public List<CompanyAmount> dueByCompany(long periodId) {
        return jdbc.query("select c.company_id, sum(c.amount), count(*) from charges c where c.period_id = ? and " + COUNTED
                + " group by c.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /**
     * Điều chỉnh kỳ trước: Σ khoản thuộc kỳ khác (đã khóa lúc duyệt) được xóa nợ và ghi nhận ở kỳ này (O10);
     * làm giảm số công ty còn phải nộp của kỳ này.
     */
    public List<CompanyAmount> writeOffAdjustmentByCompany(long periodId) {
        return jdbc.query("select c.company_id, sum(c.amount), count(*) from charges c"
                + " where c.written_off_period_id = ? and c.period_id <> c.written_off_period_id group by c.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /** Công ty đã thu: Σ thanh toán (trừ hoàn) ghi nhận ở kỳ (G4, R8, T58), kèm số lần thu (không đếm dòng hoàn). */
    public List<CompanyAmount> collectedByCompany(long periodId) {
        return jdbc.query("select c.company_id, sum(p.amount), count(*) filter (where p.amount > 0)"
                + " from payments p join charges c on c.id = p.charge_id where " + PAYMENT_PERIOD + " = ?"
                + " group by c.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /** Σ tiền hoàn (số dương) ghi nhận ở kỳ theo công ty, để hiển thị riêng (T58). */
    public List<CompanyAmount> refundedByCompany(long periodId) {
        return jdbc.query("select c.company_id, -sum(p.amount), count(*) from payments p join charges c on c.id = p.charge_id"
                + " where p.method = 'REFUND' and " + PAYMENT_PERIOD + " = ? group by c.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /**
     * Đã thu (trừ hoàn) ghi nhận ở các kỳ có hạn công ty nộp xã trước {@code today}, theo (công ty, kỳ): cơ sở tính nợ kỳ
     * trước, vì công ty chỉ phải nộp phần vận chuyển của số tiền hộ đã đóng.
     */
    public List<CompanyPeriodAmount> collectedByCompanyAndPeriodBefore(LocalDate today) {
        return jdbc.query("select c.company_id, " + PAYMENT_PERIOD + ", sum(p.amount) from payments p"
                + " join charges c on c.id = p.charge_id join collection_periods cp on cp.id = " + PAYMENT_PERIOD
                + " where cp.due_date < ? group by c.company_id, " + PAYMENT_PERIOD,
                (rs, i) -> new CompanyPeriodAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), today);
    }

    /**
     * Phần thu gom của một lần thanh toán = số tiền thanh toán × phần thu gom / số tiền khoản, lấy từ số chụp trên khoản
     * lúc phát hành (sửa biểu giá sau đó không làm đổi). Công ty cầm lại phần này, chỉ nộp phần vận chuyển về xã (xã
     * chốt 03/10). Khoản không theo biểu giá có phần thu gom 0. Dòng hoàn (số âm) trừ lại đúng tỷ lệ.
     */
    private static final String COLLECTION_PART =
            "coalesce(round(p.amount::numeric * c.collection_amount / nullif(c.amount, 0)), 0)";

    /** Phần công ty giữ lại của kỳ theo công ty: Σ phần thu gom của tiền hộ đã đóng (trừ hoàn) ghi nhận ở kỳ. */
    public List<CompanyAmount> retainedByCompany(long periodId) {
        return jdbc.query("select c.company_id, sum(" + COLLECTION_PART + "), 0"
                + " from payments p join charges c on c.id = p.charge_id where " + PAYMENT_PERIOD + " = ?"
                + " group by c.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /** Như {@link #retainedByCompany} nhưng theo (công ty, kỳ) của các kỳ có hạn công ty nộp xã trước {@code today}. */
    public List<CompanyPeriodAmount> retainedByCompanyAndPeriodBefore(LocalDate today) {
        return jdbc.query("select c.company_id, " + PAYMENT_PERIOD + ", sum(" + COLLECTION_PART + ") from payments p"
                + " join charges c on c.id = p.charge_id join collection_periods cp on cp.id = " + PAYMENT_PERIOD
                + " where cp.due_date < ? group by c.company_id, " + PAYMENT_PERIOD,
                (rs, i) -> new CompanyPeriodAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), today);
    }

    /** Đã thu theo tổ chỉ gồm thanh toán ghi nhận ở chính kỳ (hoàn của kỳ đã khóa không làm đổi số kỳ đó, O10). */
    public List<AreaProgressRow> progressByArea(long periodId) {
        return jdbc.query("select c.area_id, c.company_id, sum(c.amount), coalesce(sum(p.paid), 0), count(*),"
                + " count(*) filter (where c.status = 'PAID' or (c.amount > 0 and coalesce(p.paid, 0) >= c.amount)),"
                + " count(*) filter (where c.status = 'EXEMPT')"
                + " from charges c"
                + " left join (select p.charge_id, sum(p.amount) as paid from payments p join charges c on c.id = p.charge_id"
                + " where " + PAYMENT_PERIOD + " = c.period_id group by p.charge_id) p on p.charge_id = c.id"
                + " where c.period_id = ? and " + COUNTED
                + " group by c.area_id, c.company_id",
                (rs, i) -> new AreaProgressRow(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4), rs.getLong(5),
                        rs.getLong(6), rs.getLong(7)), periodId);
    }
}
