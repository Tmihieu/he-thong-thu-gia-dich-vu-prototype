package vn.dongthanh.vsmt.billing.domain;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ChargeRepository extends JpaRepository<Charge, Long> {

    /** Khoảng tháng đã lập khoản cùng loại phí, chồng với [from, to], cho các đối tượng (chặn trùng kỳ, R2). */
    @Query("select c.subject.id, c.coverageFrom, c.coverageTo from Charge c where c.feeType.id = :feeTypeId"
            + " and c.subject.id in :subjectIds and c.coverageFrom <= :to and c.coverageTo >= :from")
    List<Object[]> findCoverages(Long feeTypeId, Collection<Long> subjectIds, LocalDate from, LocalDate to);

    @Query(value = "select c from Charge c join fetch c.subject s join fetch c.area a join fetch c.company co"
            + " join fetch c.period p join fetch c.feeType f join fetch c.chargeRequest r"
            + " where (:periodId is null or p.id = :periodId) and (:areaId is null or a.id = :areaId)"
            + " and (:status is null or c.status = :status) and (:subjectId is null or s.id = :subjectId)"
            + " and (:companyId is null or co.id = :companyId)",
            countQuery = "select count(c) from Charge c where (:periodId is null or c.period.id = :periodId)"
            + " and (:areaId is null or c.area.id = :areaId) and (:status is null or c.status = :status)"
            + " and (:subjectId is null or c.subject.id = :subjectId) and (:companyId is null or c.company.id = :companyId)")
    Page<Charge> search(Long periodId, Long areaId, ChargeStatus status, Long subjectId, Long companyId, Pageable page);

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
}
