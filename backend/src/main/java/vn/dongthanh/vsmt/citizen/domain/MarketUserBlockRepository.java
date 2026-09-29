package vn.dongthanh.vsmt.citizen.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MarketUserBlockRepository extends JpaRepository<MarketUserBlock, MarketUserBlock.Key> {

    @Query("select count(b) > 0 from MarketUserBlock b where (b.blockerId = :a and b.blockedId = :b)"
            + " or (b.blockerId = :b and b.blockedId = :a)")
    boolean blockedEitherWay(Long a, Long b);

    Page<MarketUserBlock> findByBlockerId(Long blockerId, Pageable page);
}
