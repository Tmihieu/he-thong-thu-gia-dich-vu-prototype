package vn.dongthanh.vsmt.citizen.domain;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MarketPostReportRepository extends JpaRepository<MarketPostReport, Long> {

    boolean existsByPostIdAndReporterIdAndResolvedAtIsNull(Long postId, Long reporterId);

    long countByPostIdAndResolvedAtIsNull(Long postId);

    List<MarketPostReport> findByPostIdAndResolvedAtIsNull(Long postId);

    @Query("select r from MarketPostReport r join fetch r.reporter where r.postId = :postId order by r.createdAt desc")
    List<MarketPostReport> findAllForPost(Long postId);

    interface ReportCount {
        Long getPostId();

        long getTotal();
    }

    @Query("select r.postId as postId, count(r) as total from MarketPostReport r"
            + " where r.postId in :postIds and r.resolvedAt is null group by r.postId")
    List<ReportCount> countOpen(Collection<Long> postIds);
}
