package vn.dongthanh.vsmt.notification.service;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.notification.domain.Notification;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.domain.NotificationRepository;
import vn.dongthanh.vsmt.notification.domain.RecipientType;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Thông báo trong hệ thống. {@link #publish} là hợp đồng dùng chung cho nhắc nộp (T34), báo sai sót phiếu thu (T35),
 * khiếu nại (T36), thanh toán app (T40), rác cồng kềnh (T45); chạy trong transaction của thao tác nghiệp vụ.
 * Người dùng nội bộ thấy thông báo gửi cho vai trò mình, công ty mình (và vai trò nếu có), hoặc chính mình.
 * Đã đọc tính chung trên bản ghi (D7).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notifications;
    private final ObjectMapper json;
    private final Clock clock;

    /**
     * Nội dung một thông báo. {@code link} là đích điều hướng {@code {"screen": ..., "params": {...}}}, có thể null.
     */
    public record NotificationCommand(RecipientType type, Role role, Long companyId, Long userId, Long citizenId,
            NotificationKind kind, String title, String body, Map<String, Object> link) {

        public static NotificationCommand toRole(Role role, NotificationKind kind, String title, String body,
                Map<String, Object> link) {
            return new NotificationCommand(RecipientType.ROLE, role, null, null, null, kind, title, body, link);
        }

        /** Gửi cho công ty; {@code role} null thì mọi người của công ty đều thấy. */
        public static NotificationCommand toCompany(Long companyId, Role role, NotificationKind kind, String title,
                String body, Map<String, Object> link) {
            return new NotificationCommand(RecipientType.COMPANY, role, companyId, null, null, kind, title, body, link);
        }

        public static NotificationCommand toUser(Long userId, NotificationKind kind, String title, String body,
                Map<String, Object> link) {
            return new NotificationCommand(RecipientType.USER, null, null, userId, null, kind, title, body, link);
        }

        public static NotificationCommand toCitizen(Long citizenId, NotificationKind kind, String title, String body,
                Map<String, Object> link) {
            return new NotificationCommand(RecipientType.CITIZEN, null, null, null, citizenId, kind, title, body, link);
        }
    }

    /** Phát một thông báo; {@code createdBy} là người thao tác, null khi hệ thống hoặc người dân. */
    public Notification publish(NotificationCommand cmd, Long createdBy) {
        if (cmd.title() == null || cmd.title().isBlank() || cmd.title().length() > 200) {
            throw new IllegalArgumentException("Tiêu đề thông báo phải có và tối đa 200 ký tự");
        }
        if (cmd.body() == null || cmd.body().length() > 2000) {
            throw new IllegalArgumentException("Nội dung thông báo phải có và tối đa 2000 ký tự");
        }
        return notifications.save(Notification.create(cmd.type(), cmd.role(), cmd.companyId(), cmd.userId(),
                cmd.citizenId(), cmd.kind(), cmd.title(), cmd.body(), toJson(cmd.link()), OffsetDateTime.now(clock),
                createdBy));
    }

    @Transactional(readOnly = true)
    public Page<Notification> list(CurrentUser actor, boolean unreadOnly, NotificationKind kind, Pageable page) {
        return notifications.findVisible(actor.role(), actor.companyId(), actor.id(), unreadOnly, kind, page);
    }

    @Transactional(readOnly = true)
    public long unreadCount(CurrentUser actor) {
        return notifications.countUnread(actor.role(), actor.companyId(), actor.id());
    }

    public Notification markRead(Long id, CurrentUser actor) {
        if (!notifications.isVisible(id, actor.role(), actor.companyId(), actor.id())) {
            throw new NotFoundException("NOTIFICATION_NOT_FOUND", "Không tìm thấy thông báo.");
        }
        Notification n = notifications.findById(id).orElseThrow();
        n.markRead(OffsetDateTime.now(clock));
        return n;
    }

    public int markAllRead(CurrentUser actor) {
        return notifications.markAllRead(actor.role(), actor.companyId(), actor.id(), OffsetDateTime.now(clock));
    }

    private String toJson(Map<String, Object> link) {
        if (link == null) {
            return null;
        }
        try {
            return json.writeValueAsString(link);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Liên kết thông báo không chuyển được sang JSON", e);
        }
    }
}
