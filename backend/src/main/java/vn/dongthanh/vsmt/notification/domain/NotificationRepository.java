package vn.dongthanh.vsmt.notification.domain;

import java.time.OffsetDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import vn.dongthanh.vsmt.platform.domain.Role;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** Điều kiện "người dùng nội bộ nhìn thấy thông báo": theo vai trò, theo công ty (và vai trò nếu có), theo user. */
    String VISIBLE = "((n.recipientType = 'ROLE' and n.recipientRole = :role)"
            + " or (n.recipientType = 'COMPANY' and n.recipientCompanyId = :companyId"
            + " and (n.recipientRole is null or n.recipientRole = :role))"
            + " or (n.recipientType = 'USER' and n.recipientUserId = :userId))";

    @Query(value = "select n from Notification n where " + VISIBLE + " and (:unreadOnly = false or n.readAt is null)"
            + " and (:kind is null or n.kind = :kind)",
            countQuery = "select count(n) from Notification n where " + VISIBLE
                    + " and (:unreadOnly = false or n.readAt is null) and (:kind is null or n.kind = :kind)")
    Page<Notification> findVisible(Role role, Long companyId, Long userId, boolean unreadOnly, NotificationKind kind,
            Pageable page);

    @Query("select count(n) from Notification n where " + VISIBLE + " and n.readAt is null")
    long countUnread(Role role, Long companyId, Long userId);

    @Query("select case when count(n) > 0 then true else false end from Notification n where n.id = :id and " + VISIBLE)
    boolean isVisible(Long id, Role role, Long companyId, Long userId);

    @Modifying
    @Query("update Notification n set n.readAt = :at where n.readAt is null and " + VISIBLE)
    int markAllRead(Role role, Long companyId, Long userId, OffsetDateTime at);

    Page<Notification> findByRecipientCitizenId(Long citizenId, Pageable page);

    long countByRecipientCitizenIdAndReadAtIsNull(Long citizenId);
}
