package vn.dongthanh.vsmt.collection.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByClientRequestId(String clientRequestId);

    List<Payment> findByChargeIdOrderByPaidAtAsc(Long chargeId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.charge.id = :chargeId")
    long sumByChargeId(Long chargeId);

    /** Tiền mặt người đi thu đã thu (mọi kỳ, D5), dùng tính tiền đang giữ (R21). */
    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.collectorId = :collectorId and p.method = 'CASH'")
    long sumCashByCollector(Long collectorId);

    /** [id khoản, tổng đã thu] cho nhiều khoản. */
    @Query("select p.charge.id, sum(p.amount) from Payment p where p.charge.id in :chargeIds group by p.charge.id")
    List<Object[]> sumsByChargeIds(Collection<Long> chargeIds);

    /** Số lớn nhất đang dùng sau tiền tố mã (vd. {@code TT-1026-}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from payments where code like :prefix || '%'", nativeQuery = true)
    int maxCodeNumber(String prefix);
}
