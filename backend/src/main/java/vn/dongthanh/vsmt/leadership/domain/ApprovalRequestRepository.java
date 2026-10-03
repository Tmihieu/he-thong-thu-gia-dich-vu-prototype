package vn.dongthanh.vsmt.leadership.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, Long> {

    /** Khóa dòng tới hết transaction: hai lần duyệt song song thì lần sau thấy đã xử lý. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ApprovalRequest r where r.id = :id")
    Optional<ApprovalRequest> findByIdForUpdate(Long id);

    String WITH_DETAILS = "select r from ApprovalRequest r left join fetch r.contract ct left join fetch ct.subject"
            + " left join fetch r.charge c left join fetch c.subject left join fetch c.period left join fetch c.company"
            + " left join fetch r.effectivePeriod";

    @Query(WITH_DETAILS + " where (:status is null or r.status = :status) and (:type is null or r.type = :type)"
            + " order by r.requestedAt desc, r.id desc")
    List<ApprovalRequest> search(ApprovalStatus status, ApprovalType type);

    @Query(WITH_DETAILS + " where r.id = :id")
    Optional<ApprovalRequest> findByIdWithDetails(Long id);

    boolean existsByChargeIdAndTypeAndStatus(Long chargeId, ApprovalType type, ApprovalStatus status);

    long countByStatus(ApprovalStatus status);

    /** Khóa sinh mã tới hết transaction: hai đề nghị lập cùng lúc không trùng mã. */
    @Query(value = "select count(*) from pg_advisory_xact_lock(hashtext('approval-code'))", nativeQuery = true)
    long lockCodes();

    /** Đề nghị miễn giảm đang chờ của hợp đồng. */
    List<ApprovalRequest> findByContractIdAndTypeAndStatus(Long contractId, ApprovalType type, ApprovalStatus status);

    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from approval_requests where code like :prefix || '%'", nativeQuery = true)
    int maxSeq(String prefix);
}
