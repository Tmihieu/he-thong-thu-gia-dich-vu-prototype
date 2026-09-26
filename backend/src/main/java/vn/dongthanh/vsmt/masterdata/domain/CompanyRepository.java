package vn.dongthanh.vsmt.masterdata.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {

    Optional<Company> findByCode(String code);

    List<Company> findAllByOrderByCodeAsc();
}
