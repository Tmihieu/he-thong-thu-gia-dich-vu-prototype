package vn.dongthanh.vsmt.citizen.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketSavedPostRepository extends JpaRepository<MarketSavedPost, MarketSavedPost.Key> {

    Page<MarketSavedPost> findByCitizenId(Long citizenId, Pageable page);
}
