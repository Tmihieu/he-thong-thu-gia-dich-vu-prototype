package vn.dongthanh.vsmt.remittance.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    /** Phiếu quyết toán theo kỳ và/hoặc công ty, kỳ cũ trước. */
    @Query("select s from Settlement s join fetch s.company c join fetch s.period p"
            + " where (:periodId is null or p.id = :periodId) and (:companyId is null or c.id = :companyId)"
            + " order by p.startDate, c.code")
    List<Settlement> search(Long periodId, Long companyId);

    @Query("select s from Settlement s join fetch s.company join fetch s.period where s.id = :id")
    Optional<Settlement> findByIdWithDetails(Long id);

    @Query("select s from Settlement s join fetch s.company where s.period.id = :periodId")
    List<Settlement> findByPeriodId(Long periodId);

    /** Mọi phiếu (kèm kỳ) để tính nợ các kỳ trước. */
    @Query("select s from Settlement s join fetch s.period")
    List<Settlement> findAllWithPeriod();

    boolean existsByPeriodIdAndCompanyId(Long periodId, Long companyId);

    /** Số lớn nhất đang dùng sau tiền tố (vd. {@code QT-1026-}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from settlements where code like :prefix || '%'", nativeQuery = true)
    int maxCodeNumber(String prefix);
}
