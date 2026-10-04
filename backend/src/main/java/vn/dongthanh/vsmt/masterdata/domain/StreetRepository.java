package vn.dongthanh.vsmt.masterdata.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StreetRepository extends JpaRepository<Street, Long> {

    @Query("select s from Street s join fetch s.district where s.id = :id")
    Optional<Street> findByIdWithDistrict(Long id);

    boolean existsByDistrictIdAndNameKey(Long districtId, String nameKey);

    /** {@code nameKey} đã qua {@link AddressText#streetKey}; mỗi xã/phường một đường theo khóa này. */
    Optional<Street> findByDistrictIdAndNameKey(Long districtId, String nameKey);

    /** {@code key} đã qua {@link AddressText#streetKey}; {@code districtId} null = mọi xã. */
    @Query("select s from Street s join fetch s.district d where s.status = 'ACTIVE' and s.nameKey like %:key%"
            + " and (:districtId is null or d.id = :districtId) order by s.nameKey, d.name")
    List<Street> search(String key, Long districtId, Pageable limit);
}
