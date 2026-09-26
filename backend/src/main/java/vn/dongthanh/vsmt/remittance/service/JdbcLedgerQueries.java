package vn.dongthanh.vsmt.remittance.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class JdbcLedgerQueries implements LedgerQueries {

    private final JdbcTemplate jdbc;

    @Override
    public List<CompanyAmount> dueByCompany(long periodId) {
        return jdbc.query("select company_id, sum(amount), count(*) from charges where period_id = ? group by company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    @Override
    public List<CompanyAmount> collectedByCompany(long periodId) {
        return jdbc.query("select c.company_id, sum(p.amount), count(*) from payments p join charges c on c.id = p.charge_id"
                + " where c.period_id = ? group by c.company_id",
                (rs, i) -> new CompanyAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), periodId);
    }

    @Override
    public List<CompanyPeriodAmount> dueByCompanyAndPeriodBefore(LocalDate today) {
        return jdbc.query("select c.company_id, c.period_id, sum(c.amount) from charges c"
                + " join collection_periods p on p.id = c.period_id where p.due_date < ? group by c.company_id, c.period_id",
                (rs, i) -> new CompanyPeriodAmount(rs.getLong(1), rs.getLong(2), rs.getLong(3)), today);
    }

    @Override
    public List<AreaProgressRow> progressByArea(long periodId) {
        return jdbc.query("""
                select c.area_id, c.company_id, sum(c.amount), coalesce(sum(p.paid), 0), count(*),
                       count(*) filter (where c.status = 'PAID')
                from charges c
                left join (select charge_id, sum(amount) as paid from payments group by charge_id) p on p.charge_id = c.id
                where c.period_id = ?
                group by c.area_id, c.company_id""",
                (rs, i) -> new AreaProgressRow(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4), rs.getLong(5),
                        rs.getLong(6)), periodId);
    }
}
