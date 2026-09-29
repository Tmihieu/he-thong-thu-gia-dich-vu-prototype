package vn.dongthanh.vsmt.citizen.domain;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MarketImageRepository extends JpaRepository<MarketImage, Long> {

    List<MarketImage> findByPostIdInOrderBySortOrderAscIdAsc(Collection<Long> postIds);

    List<MarketImage> findByStorageName(String storageName);

    boolean existsByStorageNameIn(Collection<String> names);

    long countByUploaderIdAndCreatedAtGreaterThanEqual(Long uploaderId, OffsetDateTime since);

    /** File có tham chiếu rác cồng kềnh (liên kết legacy dùng chung, giữ quyền bulky hiện hữu). */
    @Query(value = "select exists (select 1 from bulky_waste_requests r"
            + " where :name = any (string_to_array(r.photo_urls, E'\n')))", nativeQuery = true)
    boolean usedByBulky(String name);
}
