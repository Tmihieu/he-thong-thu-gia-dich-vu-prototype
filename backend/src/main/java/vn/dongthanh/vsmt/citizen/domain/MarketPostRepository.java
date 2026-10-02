package vn.dongthanh.vsmt.citizen.domain;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface MarketPostRepository extends JpaRepository<MarketPost, Long> {

    String WITH_AUTHOR = "select p from MarketPost p join fetch p.author a join fetch p.area";

    /** Quan hệ chặn hai chiều giữa người xem và tác giả; người xem nội bộ truyền -1. */
    String NOT_BLOCKED = " not exists (select 1 from MarketUserBlock b where"
            + " (b.blockerId = :viewer and b.blockedId = p.author.id)"
            + " or (b.blockerId = p.author.id and b.blockedId = :viewer))";

    String FEED_WHERE = " where p.moderation = 'PUBLISHED' and p.hidden = false and p.status = :open"
            + " and exists (select 1 from MarketPost p2 join p2.tags t where p2 = p and t in :tags)"
            + " and (:category is null or p.category = :category)"
            + " and (:areaId is null or p.area.id = :areaId)"
            + " and lower(p.caption) like :pattern escape '!'"
            + " and" + NOT_BLOCKED;

    /** Tag OR (truyền đủ 4 tag khi không lọc), các nhóm khác AND; bài bị chặn loại trước khi đếm/phân trang. */
    @Query(value = WITH_AUTHOR + FEED_WHERE, countQuery = "select count(p) from MarketPost p" + FEED_WHERE)
    Page<MarketPost> feed(MarketPostStatus open, Collection<MarketTag> tags, MarketCategory category, Long areaId,
            String pattern, Long viewer, Pageable page);

    String MINE_WHERE = " where p.author.id = :authorId and (:status is null or p.status = :status)"
            + " and (:hidden is null or p.hidden = :hidden)";

    @Query(value = WITH_AUTHOR + MINE_WHERE, countQuery = "select count(p) from MarketPost p" + MINE_WHERE)
    Page<MarketPost> mine(Long authorId, MarketPostStatus status, Boolean hidden, Pageable page);

    /** Danh sách quản lý của cán bộ xã: mọi bài, kể cả ẩn/chờ duyệt/bị gỡ; {@code reported} chỉ bài có báo cáo mở. */
    String ADMIN_WHERE = " where (:moderation is null or p.moderation = :moderation)"
            + " and (:status is null or p.status = :status)"
            + " and (:reported = false or exists (select 1 from MarketPostReport r where r.postId = p.id"
            + " and r.resolvedAt is null))"
            + " and (lower(p.caption) like :pattern escape '!' or lower(p.code) like :pattern escape '!'"
            + " or lower(a.displayName) like :pattern escape '!')";

    @Query(value = WITH_AUTHOR + ADMIN_WHERE,
            countQuery = "select count(p) from MarketPost p join p.author a" + ADMIN_WHERE)
    Page<MarketPost> admin(MarketModeration moderation, MarketPostStatus status, boolean reported, String pattern,
            Pageable page);

    long countByModeration(MarketModeration moderation);

    @Query(WITH_AUTHOR + " where p.id = :id")
    Optional<MarketPost> findByIdWithAuthor(Long id);

    /** Khóa dòng bài: đóng bài và bình luận cùng lúc không vi phạm trạng thái. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from MarketPost p where p.id = :id")
    Optional<MarketPost> lockById(Long id);

    Optional<MarketPost> findByAuthorIdAndClientRequestId(Long authorId, UUID requestId);

    long countByAuthorIdAndCreatedAtGreaterThanEqual(Long authorId, OffsetDateTime since);

    /** Khóa advisory tới hết transaction (mã bài, hạn mức theo tài khoản). */
    @Query(value = "select count(*) from pg_advisory_xact_lock(hashtext(:key))", nativeQuery = true)
    long lockKey(String key);

    /** Số lớn nhất đang dùng của mã {@code CDC-nnn}; 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, 5) as integer)), 0) from market_posts where code ~ '^CDC-[0-9]+$'", nativeQuery = true)
    int maxCodeNumber();
}
