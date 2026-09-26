package vn.dongthanh.vsmt.billing.domain;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ChargeRequestRepository extends JpaRepository<ChargeRequest, Long> {

    long countByPeriodId(Long periodId);

    @Query("select r from ChargeRequest r join fetch r.period join fetch r.feeType"
            + " where (:periodId is null or r.period.id = :periodId) order by r.id desc")
    List<ChargeRequest> findForList(Long periodId);

    /** [id phiếu, số khoản, số khoản miễn, tổng tiền] tính từ charges. */
    @Query("select c.chargeRequest.id, count(c), sum(case when c.status = 'EXEMPT' then 1 else 0 end), sum(c.amount)"
            + " from Charge c where c.chargeRequest.id in :requestIds group by c.chargeRequest.id")
    List<Object[]> totalsByRequest(Collection<Long> requestIds);
}
