package vn.dongthanh.vsmt.masterdata.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PeriodAutoRuleRepository extends JpaRepository<PeriodAutoRule, Integer> {
    @Query(value = "select id from period_auto_rule where id = 1 for update", nativeQuery = true)
    Integer lockRule();
}
