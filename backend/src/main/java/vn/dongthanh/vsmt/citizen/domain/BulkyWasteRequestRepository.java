package vn.dongthanh.vsmt.citizen.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BulkyWasteRequestRepository extends JpaRepository<BulkyWasteRequest, Long> {

    String WITH_DETAILS = "select r from BulkyWasteRequest r join fetch r.citizenAccount join fetch r.subject s"
            + " join fetch s.area join fetch r.company c";

    /** Yêu cầu của hộ (mọi tài khoản của hộ thấy chung, QĐ-L10). */
    @Query(WITH_DETAILS + " where s.id = :subjectId order by r.createdAt desc, r.id desc")
    List<BulkyWasteRequest> findBySubject(Long subjectId);

    /** {@code companyId} null: mọi công ty (cán bộ xã, quản trị). */
    @Query(WITH_DETAILS + " where (:companyId is null or c.id = :companyId) and (:status is null or r.status = :status)"
            + " order by r.createdAt desc, r.id desc")
    List<BulkyWasteRequest> search(Long companyId, BulkyStatus status);

    @Query(WITH_DETAILS + " where r.id = :id")
    Optional<BulkyWasteRequest> findByIdWithDetails(Long id);

    /** Số lớn nhất đang dùng sau tiền tố (vd. {@code CK-1026-}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from bulky_waste_requests where code like :prefix || '%'", nativeQuery = true)
    int maxCodeNumber(String prefix);

    /** Khóa theo tiền tố mã tới hết transaction, để hai hộ đăng ký cùng lúc không lấy trùng số. */
    @Query(value = "select count(*) from pg_advisory_xact_lock(hashtext(:prefix))", nativeQuery = true)
    long lockCodePrefix(String prefix);

    long countBySubjectIdAndStatusIn(Long subjectId, Collection<BulkyStatus> statuses);
}
