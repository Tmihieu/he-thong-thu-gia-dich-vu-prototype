package vn.dongthanh.vsmt.masterdata.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CompanyRepository extends JpaRepository<Company, Long> {

    Optional<Company> findByCode(String code);

    List<Company> findAllByOrderByCodeAsc();

    @Query(value = "select coalesce(max(cast(substring(code, 3) as integer)), 0) from companies", nativeQuery = true)
    int maxCodeNumber();
}
