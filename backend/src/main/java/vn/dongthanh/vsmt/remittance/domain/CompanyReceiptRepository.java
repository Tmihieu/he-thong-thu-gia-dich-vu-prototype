package vn.dongthanh.vsmt.remittance.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CompanyReceiptRepository extends JpaRepository<CompanyReceipt, Long> {

    /** Phiếu thu theo kỳ và/hoặc công ty, cũ trước (để tính lũy kế đã nộp tới từng phiếu, R30). */
    @Query("select r from CompanyReceipt r join fetch r.company c join fetch r.period p"
            + " where (:periodId is null or p.id = :periodId) and (:companyId is null or c.id = :companyId)"
            + " order by p.startDate, c.code, r.receiptDate, r.id")
    List<CompanyReceipt> search(Long periodId, Long companyId);

    @Query("select r from CompanyReceipt r join fetch r.company join fetch r.period where r.id = :id")
    Optional<CompanyReceipt> findByIdWithDetails(Long id);

    /** [id công ty, tổng đã nộp, số phiếu] của một kỳ. */
    @Query("select r.company.id, sum(r.amount), count(r) from CompanyReceipt r where r.period.id = :periodId"
            + " group by r.company.id")
    List<Object[]> totalsByCompany(Long periodId);

    /** [id công ty, id kỳ, tổng đã nộp] mọi kỳ. */
    @Query("select r.company.id, r.period.id, sum(r.amount) from CompanyReceipt r group by r.company.id, r.period.id")
    List<Object[]> totalsByCompanyAndPeriod();

    /** Số lớn nhất đang dùng sau tiền tố (vd. {@code PT-CT-1026-}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from company_receipts where code like :prefix || '%'", nativeQuery = true)
    int maxCodeNumber(String prefix);
}
