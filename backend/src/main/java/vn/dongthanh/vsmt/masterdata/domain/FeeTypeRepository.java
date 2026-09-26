package vn.dongthanh.vsmt.masterdata.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FeeTypeRepository extends JpaRepository<FeeType, Long> {

    Optional<FeeType> findByCode(String code);

    List<FeeType> findAllByOrderByCodeAsc();
}
