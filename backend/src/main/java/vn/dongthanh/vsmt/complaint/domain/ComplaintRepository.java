package vn.dongthanh.vsmt.complaint.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    /** Mới nhất trước; {@code companyId} khác null thì chỉ khiếu nại đã chuyển cho công ty đó (G12). */
    @Query("select c from Complaint c join fetch c.area left join fetch c.subject left join fetch c.forwardedCompany f"
            + " where (:status is null or c.status = :status) and (:companyId is null or f.id = :companyId)"
            + " order by c.receivedDate desc, c.id desc")
    List<Complaint> search(ComplaintStatus status, Long companyId);

    @Query("select c from Complaint c join fetch c.area left join fetch c.subject left join fetch c.forwardedCompany"
            + " where c.id = :id")
    Optional<Complaint> findByIdWithDetails(Long id);

    /** Số lớn nhất đang dùng sau tiền tố (vd. {@code KN-1026-}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from complaints where code like :prefix || '%'", nativeQuery = true)
    int maxCodeNumber(String prefix);
}
