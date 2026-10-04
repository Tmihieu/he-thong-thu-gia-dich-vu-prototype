package vn.dongthanh.vsmt.billing.domain;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;

public interface ChargeRepository extends JpaRepository<Charge, Long> {

    /** Khoảng tháng đã lập khoản cùng loại phí, chồng với [from, to], cho các đối tượng (chặn trùng kỳ, R2). */
    @Query("select c.subject.id, c.coverageFrom, c.coverageTo from Charge c where c.feeType.id = :feeTypeId"
            + " and c.subject.id in :subjectIds and c.coverageFrom <= :to and c.coverageTo >= :from")
    List<Object[]> findCoverages(Long feeTypeId, Collection<Long> subjectIds, LocalDate from, LocalDate to);

    @Query(value = "select c from Charge c join fetch c.subject s join fetch c.area a join fetch c.company co"
            + " join fetch c.period p join fetch c.feeType f join fetch c.chargeRequest r"
            + " where (:periodId is null or p.id = :periodId) and (:areaId is null or a.id = :areaId)"
            + " and (:status is null or c.status = :status) and (:subjectId is null or s.id = :subjectId)"
            + " and (:companyId is null or co.id = :companyId)"
            + " and (:q = '' or lower(s.name) like lower(concat('%', :q, '%')) or lower(s.code) like lower(concat('%', :q, '%')))",
            countQuery = "select count(c) from Charge c where (:periodId is null or c.period.id = :periodId)"
            + " and (:areaId is null or c.area.id = :areaId) and (:status is null or c.status = :status)"
            + " and (:subjectId is null or c.subject.id = :subjectId) and (:companyId is null or c.company.id = :companyId)"
            + " and (:q = '' or lower(c.subject.name) like lower(concat('%', :q, '%'))"
            + " or lower(c.subject.code) like lower(concat('%', :q, '%')))")
    Page<Charge> search(Long periodId, Long areaId, ChargeStatus status, Long subjectId, Long companyId, String q,
            Pageable page);

    /** Khoản của công ty trong các tổ {@code areaIds} (phạm vi người đi thu). */
    @Query(value = "select c from Charge c join fetch c.subject s join fetch c.area a join fetch c.company co"
            + " join fetch c.period p join fetch c.feeType f join fetch c.chargeRequest r"
            + " where co.id = :companyId and a.id in :areaIds and (:periodId is null or p.id = :periodId)"
            + " and (:status is null or c.status = :status)",
            countQuery = "select count(c) from Charge c where c.company.id = :companyId and c.area.id in :areaIds"
            + " and (:periodId is null or c.period.id = :periodId) and (:status is null or c.status = :status)")
    Page<Charge> searchInAreas(Long companyId, Collection<Long> areaIds, Long periodId, ChargeStatus status,
            Pageable page);

    @Query("select c from Charge c join fetch c.subject s join fetch c.area a join fetch c.company co"
            + " join fetch c.period p join fetch c.feeType f join fetch c.chargeRequest r where c.id = :id")
    Optional<Charge> findByIdWithDetails(Long id);

    /**
     * Khóa dòng khoản tới hết transaction (SELECT … FOR UPDATE, chỉ bảng charges): gọi trước khi nạp khoản để
     * entity đọc sau khóa là bản mới nhất.
     */
    @Query(value = "select id from charges where id = :id for update", nativeQuery = true)
    Optional<Long> lockById(Long id);

    @Query("select c from Charge c join fetch c.period p join fetch c.feeType f where c.subject.id = :subjectId"
            + " order by p.startDate desc, f.code, c.id")
    List<Charge> findBySubjectIdWithPeriod(Long subjectId);

    /** Khoản của hợp đồng theo trạng thái, trong các kỳ chưa khóa (bỏ miễn giảm khi lãnh đạo từ chối, O8). */
    @Query("select c from Charge c join fetch c.period p where c.contract.id = :contractId and c.status = :status"
            + " and p.status <> :locked")
    List<Charge> findByContractInUnlockedPeriods(Long contractId, ChargeStatus status,
            PeriodStatus locked);
}
