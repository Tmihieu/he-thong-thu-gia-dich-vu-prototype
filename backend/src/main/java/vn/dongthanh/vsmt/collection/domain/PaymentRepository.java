package vn.dongthanh.vsmt.collection.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByClientRequestId(String clientRequestId);

    List<Payment> findByChargeIdOrderByPaidAtAsc(Long chargeId);

    @Query("select p from Payment p join fetch p.charge c join fetch c.subject s join fetch c.period"
            + " join fetch c.feeType join fetch c.company where s.id = :subjectId order by p.paidAt desc, p.id desc")
    List<Payment> findBySubjectIdWithCharge(Long subjectId);

    @Query("select p from Payment p join fetch p.charge c join fetch c.subject s join fetch c.period"
            + " join fetch c.feeType join fetch c.company where p.id = :id")
    Optional<Payment> findByIdWithCharge(Long id);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.charge.id = :chargeId")
    long sumByChargeId(Long chargeId);

    /** Tiền mặt người đi thu đã thu (mọi kỳ, D5), dùng tính tiền đang giữ (R21). */
    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.collectorId = :collectorId and p.method = 'CASH'")
    long sumCashByCollector(Long collectorId);

    /** [id khoản, tổng đã thu, lần thu gần nhất] cho nhiều khoản. */
    @Query("select p.charge.id, sum(p.amount), max(p.paidAt) from Payment p where p.charge.id in :chargeIds group by p.charge.id")
    List<Object[]> sumsByChargeIds(Collection<Long> chargeIds);

    /** [id khoản, tổng đã hoàn (dương)] cho nhiều khoản; hoàn là bút toán âm method REFUND. */
    @Query("select p.charge.id, -sum(p.amount) from Payment p where p.charge.id in :chargeIds and p.method = 'REFUND'"
            + " group by p.charge.id")
    List<Object[]> refundedByChargeIds(Collection<Long> chargeIds);

    /** [id khoản, lần thu, hình thức] của các lần thu (không tính hoàn), cũ trước; lần cuối của mỗi khoản là lần đóng. */
    @Query("select p.charge.id, p.paidAt, p.method from Payment p where p.charge.id in :chargeIds"
            + " and p.method <> 'REFUND' order by p.paidAt, p.id")
    List<Object[]> paymentsByChargeIds(Collection<Long> chargeIds);

    /** Số lớn nhất đang dùng sau tiền tố mã (vd. {@code TT-1026-}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from payments where code like :prefix || '%'", nativeQuery = true)
    int maxCodeNumber(String prefix);

    /** Khóa theo tiền tố mã tới hết transaction, để hai lần ghi cùng lúc không lấy trùng số. */
    @Query(value = "select count(*) from pg_advisory_xact_lock(hashtext(:prefix))", nativeQuery = true)
    long lockCodePrefix(String prefix);
}
