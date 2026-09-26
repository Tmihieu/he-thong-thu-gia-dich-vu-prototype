package vn.dongthanh.vsmt.masterdata.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AreaRepository extends JpaRepository<Area, Long> {

    @Query("select a from Area a join fetch a.district d where (:districtId is null or d.id = :districtId) order by a.code")
    List<Area> findAllWithDistrict(Long districtId);

    @Query("select a from Area a join fetch a.district where a.id = :id")
    Optional<Area> findByIdWithDistrict(Long id);
}
