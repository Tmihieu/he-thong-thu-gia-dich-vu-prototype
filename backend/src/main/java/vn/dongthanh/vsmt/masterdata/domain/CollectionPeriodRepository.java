package vn.dongthanh.vsmt.masterdata.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface CollectionPeriodRepository extends JpaRepository<CollectionPeriod, Long> {

    boolean existsByCode(String code);

    Optional<CollectionPeriod> findByCode(String code);

    /** Khóa dòng kỳ thu tới hết transaction (SELECT … FOR UPDATE): tuần tự hóa lập phiếu thu, khóa kỳ. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from CollectionPeriod p where p.id = :id")
    Optional<CollectionPeriod> findByIdForUpdate(Long id);

    /** Trạng thái kỳ đọc thẳng CSDL, khóa dòng FOR SHARE tới hết transaction (xem PeriodGuard). */
    @Query(value = "select status from collection_periods where id = :id for share", nativeQuery = true)
    String lockStatusForShare(Long id);

    @Query("select p from CollectionPeriod p join fetch p.tariffVersion where p.id = :id")
    Optional<CollectionPeriod> findByIdWithTariff(Long id);

    @Query("select p from CollectionPeriod p join fetch p.tariffVersion order by p.startDate desc, p.periodType")
    List<CollectionPeriod> findAllWithTariff();

    /** Kỳ theo trạng thái, mới nhất trước (kỳ đang thu để ghi nhận hoàn / xóa nợ của kỳ đã khóa, O10). */
    List<CollectionPeriod> findByStatusOrderByStartDateDesc(PeriodStatus status);

    /** Các kỳ (tháng và/hoặc quý) chứa ngày {@code date}. */
    @Query("select p from CollectionPeriod p join fetch p.tariffVersion"
            + " where p.startDate <= :date and p.endDate >= :date order by p.periodType")
    List<CollectionPeriod> findCovering(LocalDate date);
}
