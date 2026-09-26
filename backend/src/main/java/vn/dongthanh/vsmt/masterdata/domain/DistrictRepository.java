package vn.dongthanh.vsmt.masterdata.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DistrictRepository extends JpaRepository<District, Long> {

    Optional<District> findByCode(String code);

    List<District> findAllByOrderBySortOrderAscCodeAsc();
}
