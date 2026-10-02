package vn.dongthanh.vsmt.citizen.domain;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketImageRepository extends JpaRepository<MarketImage, Long> {

    List<MarketImage> findByPostIdInOrderBySortOrderAscIdAsc(Collection<Long> postIds);

    List<MarketImage> findByStorageName(String storageName);

    boolean existsByStorageNameIn(Collection<String> names);

    long countByUploaderIdAndCreatedAtGreaterThanEqual(Long uploaderId, OffsetDateTime since);
}
