package vn.dongthanh.vsmt.masterdata.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CollectionPeriodRepository extends JpaRepository<CollectionPeriod, Long> {

    boolean existsByCode(String code);

    Optional<CollectionPeriod> findByCode(String code);

    @Query("select p from CollectionPeriod p join fetch p.tariffVersion where p.id = :id")
    Optional<CollectionPeriod> findByIdWithTariff(Long id);

    @Query("select p from CollectionPeriod p join fetch p.tariffVersion order by p.startDate desc, p.periodType")
    List<CollectionPeriod> findAllWithTariff();

    /** Các kỳ (tháng và/hoặc quý) chứa ngày {@code date}. */
    @Query("select p from CollectionPeriod p join fetch p.tariffVersion"
            + " where p.startDate <= :date and p.endDate >= :date order by p.periodType")
    List<CollectionPeriod> findCovering(LocalDate date);
}
