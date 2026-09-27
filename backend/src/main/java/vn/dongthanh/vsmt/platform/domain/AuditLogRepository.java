package vn.dongthanh.vsmt.platform.domain;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByEntityTypeAndEntityIdOrderByOccurredAtAscIdAsc(String entityType, String entityId);

    /**
     * Tìm nhật ký trong [{@code from}, {@code to}); tham số null thì bỏ qua. {@code actor} rỗng thì bỏ qua,
     * nếu có thì là chuỗi con chữ thường, so bằng {@code locate} chứ không {@code like} để {@code _}/{@code %}
     * trong tên đăng nhập (canbo_xa…) không thành ký tự đại diện. {@code cast} để PostgreSQL biết kiểu của
     * mốc thời gian null (không thì lỗi "could not determine data type of parameter").
     */
    @Query("select a from AuditLog a where (cast(:from as OffsetDateTime) is null or a.occurredAt >= :from)"
            + " and (cast(:to as OffsetDateTime) is null or a.occurredAt < :to)"
            + " and (:actor = '' or locate(:actor, lower(a.actorUsername)) > 0)"
            + " and (:action is null or a.action = :action)")
    Page<AuditLog> search(OffsetDateTime from, OffsetDateTime to, String actor, String action, Pageable page);
}
