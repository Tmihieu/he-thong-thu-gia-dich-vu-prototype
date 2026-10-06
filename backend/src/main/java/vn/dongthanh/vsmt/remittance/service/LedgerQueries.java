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

    /** Chuyển khoản vào tài khoản xã đã khớp khoản: tổng ròng và phần thu gom của công ty trong đó. */
    public record QrAmount(long companyId, long total, long collection) {
    }

    /** Giao dịch tiền vào chưa khớp được khoản nào: số giao dịch và tổng tiền. */
    public record UnidentifiedQr(long count, long amount) {
    }

    /** Tiến độ theo tổ của một kỳ: công ty chụp trên khoản, phải thu, đã thu, số khoản, số khoản đã thu đủ. */
    public record AreaProgressRow(long areaId, long companyId, long due, long collected, long chargeCount, long paidCount, long exemptCount) {
    }

    /** Một khoản Chưa thu của kỳ đã khóa (công nợ hộ); {@code debtPeriods} = số kỳ đã khóa hộ đó còn nợ. */
    public record HouseholdDebtRow(long chargeId, String subjectCode, String subjectName, String address, long areaId,
            String areaCode, String areaName, long companyId, String companyCode, String companyName, long periodId,
            String periodLabel, long amount, long debtPeriods) {
    }

    /** Tổng công nợ hộ: số hộ (đếm một lần dù nợ nhiều kỳ), số khoản, tổng tiền. */
    public record HouseholdDebtTotals(long households, long charges, long amount) {
    }

    /** Số hộ còn nợ theo (tổ, công ty trên khoản). */
    public record AreaDebtRow(long areaId, long companyId, long households) {
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
     * Phần thu gom của một khoản = số tiền × thu gom / (thu gom + vận chuyển) của nhóm giá trong biểu giá của kỳ. Công ty
     * cầm lại phần này, chỉ nộp phần vận chuyển về xã (xã chốt 03/10). Khoản không theo biểu giá thì không có phần giữ lại.
     */
    private static final String COLLECTION_PART =
            "coalesce(round(c.amount * r.collection_fee::numeric / nullif(r.monthly_total, 0)), 0)";

    private static final String COLLECTION_JOIN = " join collection_periods cp on cp.id = c.period_id"
            + " left join tariff_rates r on r.tariff_version_id = cp.tariff_version_id and r.tariff_group = c.tariff_group";

    /** Σ thanh toán ròng ghi nhận ở kỳ không phải chuyển khoản (tiền mặt, trừ hoàn): tiền công ty đang giữ để nộp xã. */
    public List<CompanyAmount> cashCollectedByCompany(long periodId) {
        return jdbc.query("select c.company_id, sum(p.amount), count(*) filter (where p.amount > 0)"
                + " from payments p join charges c on c.id = p.charge_id where " + PAYMENT_PERIOD + " = ?"
                + " and p.method <> 'TRANSFER' group by c.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /**
     * Phần công ty giữ lại (phí thu gom) của kỳ theo công ty, tính trên TOÀN BỘ số đã thu kể cả chuyển khoản (góp ý BA
     * 05/10): mỗi khoản lấy Σ thanh toán ròng ghi ở kỳ × collection_fee / monthly_total, làm tròn đồng một lần theo khoản,
     * rồi cộng lại; trừ phần thu gom của khoản kỳ khác được xóa nợ ghi ở kỳ này (cùng cách tính với điều chỉnh). Khoản
     * phí cố định (không có đơn giá nhóm) không có phần thu gom. Số {@code count} không dùng.
     */
    public List<CompanyAmount> retainedByCompany(long periodId) {
        return jdbc.query("select x.company_id, sum(x.v), 0 from ("
                + " select c.company_id, coalesce(round(sum(p.amount) * r.collection_fee::numeric"
                + " / nullif(r.monthly_total, 0)), 0) as v from payments p join charges c on c.id = p.charge_id"
                + COLLECTION_JOIN + " where " + PAYMENT_PERIOD + " = ?"
                + " group by c.id, c.company_id, r.collection_fee, r.monthly_total"
                + " union all"
                + " select c.company_id, -" + COLLECTION_PART + " from charges c" + COLLECTION_JOIN
                + " where c.written_off_period_id = ? and c.period_id <> c.written_off_period_id"
                + ") x group by x.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId, periodId);
    }

    /**
     * Chuyển khoản ghi nhận ở kỳ theo công ty: Σ thanh toán ròng và phần thu gom trong đó (cùng cách làm tròn theo khoản
     * với {@link #retainedByCompany}). Xã giữ tiền này và phải trả lại phần thu gom cho công ty.
     */
    public List<QrAmount> qrByCompany(long periodId) {
        return jdbc.query("select x.company_id, sum(x.t), sum(x.v) from ("
                + " select c.company_id, sum(p.amount) as t, coalesce(round(sum(p.amount) * r.collection_fee::numeric"
                + " / nullif(r.monthly_total, 0)), 0) as v from payments p join charges c on c.id = p.charge_id"
                + COLLECTION_JOIN + " where " + PAYMENT_PERIOD + " = ? and p.method = 'TRANSFER'"
                + " group by c.id, c.company_id, r.collection_fee, r.monthly_total) x group by x.company_id",
                (rs, i) -> new QrAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /** Giao dịch chuyển khoản vào tài khoản xã chưa khớp khoản nào (chờ cán bộ xã xử lý). */
    public UnidentifiedQr unidentifiedQr() {
        return jdbc.queryForObject("select count(*), coalesce(sum(amount), 0) from bank_transfers where status = 'UNMATCHED'",
                (rs, i) -> new UnidentifiedQr(rs.getLong(1), rs.getLong(2)));
    }

    /**
     * Phải nộp xã theo (công ty, kỳ) của các kỳ có hạn nộp trước {@code today}: tiền mặt đã thu − điều chỉnh − phần thu
     * gom của số đã thu, cùng công thức với {@link #cashCollectedByCompany}, {@link #retainedByCompany} và
     * {@link #writeOffAdjustmentByCompany}. Có thể âm (xã trả lại công ty).
     */
    public List<CompanyPeriodAmount> payableByCompanyAndPeriodBefore(LocalDate today) {
        return jdbc.query("select x.company_id, x.period_id, sum(x.v) from ("
                + " select c.company_id, " + PAYMENT_PERIOD + " as period_id,"
                + " sum(case when p.method <> 'TRANSFER' then p.amount else 0 end)"
                + " - coalesce(round(sum(p.amount) * r.collection_fee::numeric / nullif(r.monthly_total, 0)), 0) as v"
                + " from payments p join charges c on c.id = p.charge_id" + COLLECTION_JOIN
                + " group by c.id, c.company_id, p.ledger_period_id, c.period_id, r.collection_fee, r.monthly_total"
                + " union all"
                + " select c.company_id, c.written_off_period_id, -(c.amount - " + COLLECTION_PART + ") from charges c"
                + COLLECTION_JOIN
                + " where c.written_off_period_id is not null and c.period_id <> c.written_off_period_id"
                + ") x join collection_periods p on p.id = x.period_id"
                + " where p.due_date < ? group by x.company_id, x.period_id",
                (rs, i) -> new CompanyPeriodAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), today);
    }

    /** Số khoản Chưa thu của kỳ: kỳ "đã thu đủ mọi khoản" khi bằng 0 (UC-39). Khoản miễn, đã xóa nợ không tính. */
    public long unpaidChargeCount(long periodId) {
        Long n = jdbc.queryForObject("select count(*) from charges c where c.period_id = ? and c.status = 'UNPAID'",
                Long.class, periodId);
        return n == null ? 0 : n;
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

    /**
     * Thanh toán công nợ kỳ cũ ghi nhận ở kỳ này: thanh toán (trừ hoàn) của khoản thuộc kỳ khác đã khóa, ghi vào kỳ đang
     * thu qua {@code ledger_period_id}. Là một phần của {@link #collectedByCompany}.
     */
    public List<CompanyAmount> debtCollectedByCompany(long periodId) {
        return jdbc.query("select c.company_id, sum(p.amount), count(*) filter (where p.amount > 0)"
                + " from payments p join charges c on c.id = p.charge_id"
                + " where p.ledger_period_id = ? and c.period_id <> p.ledger_period_id group by c.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /**
     * Công nợ tháng trước: khoản Chưa thu của kỳ liền trước kỳ đang xem (theo ngày bắt đầu, bỏ kỳ nháp), trừ số hộ đã
     * đóng một phần; tính theo hiện tại nên hộ đóng nợ cũ thì số này giảm ngay. Nợ cũ hơn xem ở công nợ hộ.
     */
    public List<CompanyAmount> lastPeriodUnpaidByCompany(long periodId) {
        return jdbc.query("select c.company_id, sum(c.amount - coalesce(p.paid, 0)), count(*)"
                + " from charges c left join (select charge_id, sum(amount) as paid from payments group by charge_id) p"
                + " on p.charge_id = c.id"
                + " where c.status = 'UNPAID' and c.period_id = (select prev.id from collection_periods prev, collection_periods cur"
                + " where cur.id = ? and prev.start_date < cur.start_date and prev.status <> 'DRAFT'"
                + " order by prev.start_date desc limit 1)"
                + " group by c.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    /** Công nợ hộ = khoản Chưa thu của kỳ đã khóa (không có bảng riêng); lọc tùy chọn theo công ty, tổ. */
    private static final String DEBT_FROM = " from charges c join collection_periods cp on cp.id = c.period_id"
            + " and cp.status = 'LOCKED' where c.status = 'UNPAID'";

    private static String debtFilter(Long companyId, Long areaId, List<Object> args) {
        StringBuilder sb = new StringBuilder();
        if (companyId != null) {
            sb.append(" and c.company_id = ?");
            args.add(companyId);
        }
        if (areaId != null) {
            sb.append(" and c.area_id = ?");
            args.add(areaId);
        }
        return sb.toString();
    }

    public HouseholdDebtTotals householdDebtTotals(Long companyId, Long areaId) {
        List<Object> args = new java.util.ArrayList<>();
        String where = debtFilter(companyId, areaId, args);
        return jdbc.queryForObject("select count(distinct c.subject_id), count(*), coalesce(sum(c.amount), 0)" + DEBT_FROM + where,
                (rs, i) -> new HouseholdDebtTotals(rs.getLong(1), rs.getLong(2), rs.getLong(3)), args.toArray());
    }

    /** Khoản công nợ hộ, kỳ cũ trước rồi theo mã hộ; số kỳ nợ đếm trên mọi kỳ đã khóa, không phụ thuộc bộ lọc. */
    public List<HouseholdDebtRow> householdDebts(Long companyId, Long areaId, int limit, long offset) {
        List<Object> args = new java.util.ArrayList<>();
        String where = debtFilter(companyId, areaId, args).replace("c.", "x.");
        args.add(limit);
        args.add(offset);
        return jdbc.query("select x.id, x.scode, x.sname, x.address, x.area_id, x.acode, x.aname, x.company_id, x.cocode,"
                + " x.coname, x.period_id, x.label, x.amount, x.debt_periods from ("
                + " select c.id, s.code as scode, s.name as sname, s.address, c.area_id, a.code as acode, a.name as aname,"
                + " c.company_id, co.code as cocode, co.name as coname, c.period_id, cp.label, cp.start_date, c.amount,"
                + " count(*) over (partition by c.subject_id) as debt_periods"
                + " from charges c join collection_periods cp on cp.id = c.period_id and cp.status = 'LOCKED'"
                + " join service_subjects s on s.id = c.subject_id join areas a on a.id = c.area_id"
                + " join companies co on co.id = c.company_id where c.status = 'UNPAID') x where true" + where
                + " order by x.start_date, x.scode, x.id limit ? offset ?",
                (rs, i) -> new HouseholdDebtRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getLong(5),
                        rs.getString(6), rs.getString(7), rs.getLong(8), rs.getString(9), rs.getString(10), rs.getLong(11),
                        rs.getString(12), rs.getLong(13), rs.getLong(14)),
                args.toArray());
    }

    /** Số hộ còn nợ kỳ đã khóa theo (tổ, công ty trên khoản), cho cột "Hộ còn nợ kỳ cũ" của tiến độ theo tổ. */
    public List<AreaDebtRow> debtHouseholdsByArea() {
        return jdbc.query("select c.area_id, c.company_id, count(distinct c.subject_id)" + DEBT_FROM
                + " group by c.area_id, c.company_id",
                (rs, i) -> new AreaDebtRow(rs.getLong(1), rs.getLong(2), rs.getLong(3)));
    }
}
