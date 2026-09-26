package vn.dongthanh.vsmt.collection.domain;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CollectorAssignmentRepository extends JpaRepository<CollectorAssignment, Long> {

    String FETCH = "select a from CollectorAssignment a join fetch a.collector join fetch a.area ar join fetch a.company c";

    /** Phân tổ còn hiệu lực từ ngày {@code date} trở đi (hoặc bắt đầu sau), của một tổ. */
    @Query(FETCH + " where ar.id = :areaId and (a.validTo is null or a.validTo >= :date) order by a.validFrom")
    List<CollectorAssignment> findOpenForArea(Long areaId, LocalDate date);

    @Query(FETCH + " where a.validFrom <= :date and (a.validTo is null or a.validTo >= :date)"
            + " and (:companyId is null or c.id = :companyId) order by ar.code")
    List<CollectorAssignment> findActiveOn(LocalDate date, Long companyId);

    @Query("select a.area.id from CollectorAssignment a where a.collector.id = :collectorId"
            + " and a.validFrom <= :date and (a.validTo is null or a.validTo >= :date)")
    List<Long> findAreaIdsOf(Long collectorId, LocalDate date);

    @Query(FETCH + " where a.collector.id = :collectorId and a.validFrom <= :date"
            + " and (a.validTo is null or a.validTo >= :date) order by ar.code")
    List<CollectorAssignment> findActiveOfCollector(Long collectorId, LocalDate date);

    /** Phân tổ của một công ty ở một tổ còn hiệu lực tại hoặc sau {@code date} (để kết thúc khi đổi công ty, G14). */
    @Query("select a from CollectorAssignment a where a.area.id = :areaId and a.company.id = :companyId"
            + " and (a.validTo is null or a.validTo >= :date)")
    List<CollectorAssignment> findOpenOfCompanyInArea(Long areaId, Long companyId, LocalDate date);
}
