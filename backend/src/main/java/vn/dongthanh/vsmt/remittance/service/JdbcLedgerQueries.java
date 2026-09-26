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
}
