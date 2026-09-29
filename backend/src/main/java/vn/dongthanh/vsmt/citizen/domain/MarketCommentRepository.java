package vn.dongthanh.vsmt.citizen.domain;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MarketCommentRepository extends JpaRepository<MarketComment, Long> {

    /** Bình luận của người không có quan hệ chặn với người xem (người xem nội bộ truyền -1). */
    String VISIBLE = " where c.post.id = :postId and not exists (select 1 from MarketUserBlock b where"
            + " (b.blockerId = :viewer and b.blockedId = c.author.id)"
            + " or (b.blockerId = c.author.id and b.blockedId = :viewer))";

    @Query(value = "select c from MarketComment c join fetch c.author" + VISIBLE,
            countQuery = "select count(c) from MarketComment c" + VISIBLE)
    Page<MarketComment> visible(Long postId, Long viewer, Pageable page);

    @Query("select c.post.id as postId, count(c) as total from MarketComment c where c.post.id in :postIds"
            + " and not exists (select 1 from MarketUserBlock b where"
            + " (b.blockerId = :viewer and b.blockedId = c.author.id)"
            + " or (b.blockerId = c.author.id and b.blockedId = :viewer))"
            + " group by c.post.id")
    List<CommentCount> countVisible(Collection<Long> postIds, Long viewer);

    @Query("select distinct c.author.id from MarketComment c where c.post.id = :postId")
    List<Long> commenterIds(Long postId);

    Optional<MarketComment> findByAuthorIdAndClientRequestId(Long authorId, UUID requestId);

    long countByAuthorIdAndCreatedAtGreaterThanEqual(Long authorId, OffsetDateTime since);

    interface CommentCount {
        Long getPostId();

        Long getTotal();
    }
}
