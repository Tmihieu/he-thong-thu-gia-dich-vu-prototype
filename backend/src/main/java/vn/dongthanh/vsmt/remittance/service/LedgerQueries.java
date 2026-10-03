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

    /** Khoản hộ còn phải đóng: miễn giảm và đã xóa nợ không nằm trong mẫu số "đã thu / cần thu". */
    private static final String NEEDS_PAYMENT = "c.status not in ('EXEMPT', 'WRITTEN_OFF')";

    /** Kỳ ghi nhận của một thanh toán: hoàn tiền có kỳ riêng (T58, O10), còn lại là kỳ của khoản. */
    private static final String PAYMENT_PERIOD = "coalesce(p.ledger_period_id, c.period_id)";

    /** Phải thu: Σ số tiền khoản theo công ty chụp lúc phát hành (G3), kèm số khoản. */
    public List<CompanyAmount> dueByCompany(long periodId) {
        return jdbc.query("select c.company_id, sum(c.amount), count(*) filter (where " + NEEDS_PAYMENT + ") from charges c where c.period_id = ? and " + COUNTED
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
     * Phải thu (đã trừ điều chỉnh xóa nợ kỳ trước ghi ở kỳ đó) theo (công ty, kỳ) của các kỳ có hạn công ty nộp xã
     * trước {@code today}.
     */
    public List<CompanyPeriodAmount> dueByCompanyAndPeriodBefore(LocalDate today) {
        return jdbc.query("select x.company_id, x.period_id, sum(x.amount) from ("
                + " select c.company_id, c.period_id, c.amount from charges c where " + COUNTED
                + " union all"
                + " select c.company_id, c.written_off_period_id, -c.amount from charges c"
                + " where c.written_off_period_id is not null and c.period_id <> c.written_off_period_id"
                + ") x join collection_periods p on p.id = x.period_id"
                + " where p.due_date < ? group by x.company_id, x.period_id",
                (rs, i) -> new CompanyPeriodAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), today);
    }

    /**
     * Phần thu gom của một khoản = số tiền × thu gom / (thu gom + vận chuyển) của nhóm giá trong biểu giá của kỳ. Công ty
     * cầm lại phần này, chỉ nộp phần vận chuyển về xã (xã chốt 03/10). Khoản không theo biểu giá thì không có phần giữ lại.
     */
    private static final String COLLECTION_PART =
            "coalesce(round(c.amount * r.collection_fee::numeric / nullif(r.monthly_total, 0)), 0)";

    private static final String COLLECTION_JOIN = " join collection_periods cp on cp.id = c.period_id"
            + " left join tariff_rates r on r.tariff_version_id = cp.tariff_version_id and r.tariff_group = c.tariff_group";

    /**
     * Phần công ty giữ lại của kỳ theo công ty: Σ phần thu gom các khoản còn tính phải thu, trừ phần thu gom của khoản kỳ
     * khác được xóa nợ ghi nhận ở kỳ này (cùng cách tính với phải thu và điều chỉnh). Số {@code count} không dùng.
     */
    public List<CompanyAmount> retainedByCompany(long periodId) {
        return jdbc.query("select x.company_id, sum(x.v), 0 from ("
                + " select c.company_id, " + COLLECTION_PART + " as v from charges c" + COLLECTION_JOIN
                + " where c.period_id = ? and " + COUNTED
                + " union all"
                + " select c.company_id, -" + COLLECTION_PART + " from charges c" + COLLECTION_JOIN
                + " where c.written_off_period_id = ? and c.period_id <> c.written_off_period_id"
                + ") x group by x.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId, periodId);
    }

    /** Như {@link #retainedByCompany} nhưng theo (công ty, kỳ) của các kỳ có hạn công ty nộp xã trước {@code today}. */
    public List<CompanyPeriodAmount> retainedByCompanyAndPeriodBefore(LocalDate today) {
        return jdbc.query("select x.company_id, x.period_id, sum(x.v) from ("
                + " select c.company_id, c.period_id, " + COLLECTION_PART + " as v from charges c" + COLLECTION_JOIN
                + " where " + COUNTED
                + " union all"
                + " select c.company_id, c.written_off_period_id, -" + COLLECTION_PART + " from charges c" + COLLECTION_JOIN
                + " where c.written_off_period_id is not null and c.period_id <> c.written_off_period_id"
                + ") x join collection_periods p on p.id = x.period_id"
                + " where p.due_date < ? group by x.company_id, x.period_id",
                (rs, i) -> new CompanyPeriodAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), today);
    }

    /**
     * Phần thu gom nằm trong số tiền công ty ĐÃ THU của kỳ (QĐ-L15): mỗi khoản lấy Σ thanh toán ròng ghi ở kỳ ×
     * collection_fee / monthly_total, làm tròn đồng một lần theo khoản. Khoản phí cố định (không có đơn giá nhóm) không có
     * phần thu gom nên tính cả vào phần phải nộp. Số {@code count} không dùng.
     */
    public List<CompanyAmount> retainedOfCollectedByCompany(long periodId) {
        return jdbc.query("select x.company_id, sum(x.v), 0 from ("
                + " select c.company_id, coalesce(round(sum(p.amount) * r.collection_fee::numeric"
                + " / nullif(r.monthly_total, 0)), 0) as v from payments p join charges c on c.id = p.charge_id"
                + COLLECTION_JOIN + " where " + PAYMENT_PERIOD + " = ?"
                + " group by c.id, c.company_id, r.collection_fee, r.monthly_total) x group by x.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /** Đã thu theo tổ chỉ gồm thanh toán ghi nhận ở chính kỳ (hoàn của kỳ đã khóa không làm đổi số kỳ đó, O10). */
    public List<AreaProgressRow> progressByArea(long periodId) {
        return jdbc.query("select c.area_id, c.company_id, sum(c.amount), coalesce(sum(p.paid), 0), count(*) filter (where " + NEEDS_PAYMENT + "),"
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
