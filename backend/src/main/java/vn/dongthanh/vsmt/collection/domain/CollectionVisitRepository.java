package vn.dongthanh.vsmt.collection.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CollectionVisitRepository extends JpaRepository<CollectionVisit, Long> {

    Optional<CollectionVisit> findByClientRequestId(String clientRequestId);

    List<CollectionVisit> findByChargeIdOrderByVisitedAtAsc(Long chargeId);

    /** Lượt ghé mới nhất của mỗi khoản (để danh sách người đi thu hiện "vắng / hẹn / từ chối"). */
    @Query("select v from CollectionVisit v where v.charge.id in :chargeIds and v.visitedAt ="
            + " (select max(v2.visitedAt) from CollectionVisit v2 where v2.charge.id = v.charge.id)")
    List<CollectionVisit> findLatestByChargeIds(Collection<Long> chargeIds);
}
