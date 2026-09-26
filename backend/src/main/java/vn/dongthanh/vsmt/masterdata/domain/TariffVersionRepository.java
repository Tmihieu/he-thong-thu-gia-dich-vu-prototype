package vn.dongthanh.vsmt.masterdata.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TariffVersionRepository extends JpaRepository<TariffVersion, Long> {

    Optional<TariffVersion> findByCode(String code);

    @Query("select distinct v from TariffVersion v left join fetch v.rates order by v.validFrom desc")
    List<TariffVersion> findAllWithRates();

    /** Các phiên bản đã ban hành (không phải dự thảo), kèm đơn giá. */
    @Query("select distinct v from TariffVersion v left join fetch v.rates where v.status <> :excluded")
    List<TariffVersion> findAllWithRatesByStatusNot(TariffStatus excluded);
}
