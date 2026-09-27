package vn.dongthanh.vsmt.citizen.domain;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MarketCommentRepository extends JpaRepository<MarketComment, Long> {

    /** Cũ trước, kèm người bình luận, hộ và tổ. */
    @Query("select c from MarketComment c join fetch c.author a join fetch a.subject s join fetch s.area"
            + " where c.post.id = :postId order by c.createdAt, c.id")
    List<MarketComment> findByPostWithAuthor(Long postId);

    @Query("select c.post.id as postId, count(c) as total from MarketComment c where c.post.id in :postIds"
            + " group by c.post.id")
    List<CommentCount> countByPostIds(Collection<Long> postIds);

    long countByPostId(Long postId);

    interface CommentCount {
        Long getPostId();

        Long getTotal();
    }
}
