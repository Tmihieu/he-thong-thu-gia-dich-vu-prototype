package vn.dongthanh.vsmt.remittance.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CommunePayoutRepository extends JpaRepository<CommunePayout, Long> {

    /** Phiếu chi theo kỳ và/hoặc công ty, cũ trước (để tính lũy kế xã đã trả tới từng phiếu). */
    @Query("select r from CommunePayout r join fetch r.company c join fetch r.period p"
            + " where (:periodId is null or p.id = :periodId) and (:companyId is null or c.id = :companyId)"
            + " order by p.startDate, c.code, r.payoutDate, r.id")
    List<CommunePayout> search(Long periodId, Long companyId);

    @Query("select r from CommunePayout r join fetch r.company join fetch r.period where r.id = :id")
    Optional<CommunePayout> findByIdWithDetails(Long id);

    /** [id công ty, tổng xã đã trả] của một kỳ. */
    @Query("select r.company.id, sum(r.amount) from CommunePayout r where r.period.id = :periodId group by r.company.id")
    List<Object[]> totalsByCompany(Long periodId);

    /** Số lớn nhất đang dùng sau tiền tố (vd. {@code PC-CT-1026-}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from commune_payouts where code like :prefix || '%'", nativeQuery = true)
    int maxCodeNumber(String prefix);
}
