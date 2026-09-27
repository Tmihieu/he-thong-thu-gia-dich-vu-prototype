package vn.dongthanh.vsmt.platform.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.VsmtApplication;
import vn.dongthanh.vsmt.platform.domain.AuditLog;
import vn.dongthanh.vsmt.platform.domain.AuditLogRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/** Tra cứu nhật ký thao tác cho màn quản trị (T52). */
@Service
@RequiredArgsConstructor
public class AuditLogQueryService {

    private static final ZoneId ZONE = ZoneId.of(VsmtApplication.TIME_ZONE);

    private final AuditLogRepository logs;

    /** Lọc theo ngày giờ Việt Nam (gồm trọn ngày {@code to}), tên đăng nhập chứa chuỗi, đúng mã hành động. */
    @Transactional(readOnly = true)
    public Page<AuditLog> search(LocalDate from, LocalDate to, String actorUsername, String action, Pageable page,
            CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        String who = actorUsername == null ? "" : actorUsername.trim().toLowerCase(Locale.ROOT);
        return logs.search(startOf(from), to == null ? null : startOf(to.plusDays(1)), who,
                action == null || action.isBlank() ? null : action.trim().toUpperCase(Locale.ROOT), page);
    }

    private static OffsetDateTime startOf(LocalDate date) {
        return date == null ? null : date.atStartOfDay(ZONE).toOffsetDateTime();
    }
}
