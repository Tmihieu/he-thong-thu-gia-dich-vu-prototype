package vn.dongthanh.vsmt.citizen.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MarketFilterKeywordRepository extends JpaRepository<MarketFilterKeyword, Long> {

    @Query("select count(k) > 0 from MarketFilterKeyword k where lower(k.keyword) = lower(:keyword)")
    boolean existsIgnoreCase(String keyword);
}
