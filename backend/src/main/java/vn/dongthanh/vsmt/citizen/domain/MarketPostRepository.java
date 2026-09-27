package vn.dongthanh.vsmt.citizen.domain;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MarketPostRepository extends JpaRepository<MarketPost, Long> {

    /** Kèm người đăng, hộ và tổ để hiển thị "tên · tổ". */
    String WITH_AUTHOR = "select p from MarketPost p join fetch p.author a join fetch a.subject s join fetch s.area";

    @Query(value = WITH_AUTHOR + " where p.status = :status and (:type is null or p.postType = :type)",
            countQuery = "select count(p) from MarketPost p where p.status = :status"
                    + " and (:type is null or p.postType = :type)")
    Page<MarketPost> search(MarketPostStatus status, MarketPostType type, Pageable page);

    @Query(WITH_AUTHOR + " where p.id = :id")
    Optional<MarketPost> findByIdWithAuthor(Long id);

    /** Khóa theo tiền tố mã tới hết transaction, để hai người đăng cùng lúc không lấy trùng số. */
    @Query(value = "select count(*) from pg_advisory_xact_lock(hashtext(:prefix))", nativeQuery = true)
    long lockCodePrefix(String prefix);

    /** Số lớn nhất đang dùng của mã {@code CDC-nnn}; 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, 5) as integer)), 0) from market_posts", nativeQuery = true)
    int maxCodeNumber();
}
