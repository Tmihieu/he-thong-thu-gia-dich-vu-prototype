package vn.dongthanh.vsmt.masterdata.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StreetRepository extends JpaRepository<Street, Long> {

    @Query("select s from Street s left join fetch s.parent where s.id = :id")
    Optional<Street> findByIdWithParent(Long id);

    /** Toàn bộ danh mục (vài trăm đến vài nghìn dòng) kèm đường cha, ấp và tên cũ. */
    @Query("select distinct s from Street s left join fetch s.parent left join fetch s.areaIds left join fetch s.oldNames")
    List<Street> findAllForCatalog();

    /** {@code nameKey} đã qua {@link AddressText#streetKey}. Đường: {@code parentId} null. */
    @Query("select s from Street s where s.nameKey = :nameKey and "
            + "((:parentId is null and s.parent is null) or s.parent.id = :parentId)")
    Optional<Street> findByParentAndNameKey(Long parentId, String nameKey);

    @Query("select count(s) > 0 from Street s where s.parent.id = :parentId")
    boolean hasAlleys(Long parentId);

    /**
     * Tìm theo tên, tên cũ, hoặc tên hiển thị của hẻm ("hem 19 to ky"); {@code key} đã qua {@link AddressText#streetKey}.
     * Đường trước hẻm.
     */
    @Query("select distinct s from Street s left join fetch s.parent p left join s.oldNames o where s.status = 'ACTIVE' and "
            + "(s.nameKey like %:key% or o.nameKey like %:key% or concat(s.nameKey, ' ', p.nameKey) like %:key%) "
            + "order by s.kind desc, s.nameKey")
    List<Street> search(String key, Pageable limit);
}
