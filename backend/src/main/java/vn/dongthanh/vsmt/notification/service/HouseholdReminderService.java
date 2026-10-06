package vn.dongthanh.vsmt.notification.service;

import java.sql.Date;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Nhắc hộ dân nộp phí trong app (góp ý BA 03/10): khi vừa phát hành khoản, trước hạn 3 ngày và sau hạn 1 ngày.
 * Chỉ nhắc khoản còn UNPAID (hộ đã nộp, miễn, xóa nợ thì không nhắc) và chỉ khi hộ có tài khoản app; mỗi (khoản, mốc)
 * một lần nhờ bảng {@code household_reminders}. SMS/Zalo để sau (tốn phí, cần nhà cung cấp).
 */
@Service
@RequiredArgsConstructor
public class HouseholdReminderService {

    /** BA: nhắc trước hạn 3 ngày. */
    static final int DUE_SOON_DAYS = 3;

    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final JdbcTemplate jdbc;
    private final NotificationService notifications;
    private final Clock clock;
    private final AuditService audit;

    private record Due(long chargeId, long subjectId, long remaining, LocalDate dueDate, String periodCode) {
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runDaily() {
        run();
    }

    /** Xã bấm chạy tay: như {@link #run()} nhưng ghi audit ai chạy và gửi bao nhiêu thông báo. */
    @Transactional
    public int runBy(CurrentUser actor) {
        int sent = run();
        audit.record(actor, "RUN_HOUSEHOLD_REMINDERS", "HouseholdReminder", LocalDate.now(clock).toString(), null,
                Map.of("sent", sent));
        return sent;
    }

    /** Chạy cả ba mốc cho hôm nay; trả số thông báo đã gửi. Gọi tay được (xã bấm thử) mà không gửi trùng. */
    @Transactional
    public int run() {
        LocalDate today = LocalDate.now(clock);
        // ponytail: OVERDUE chỉ bắt đúng hạn+1 ngày; job tắt đúng ngày đó thì hộ không được nhắc quá hạn (thêm cửa sổ ngày nếu cần).
        return send("OPEN", "per.due_date >= ?", today)
                + send("DUE_SOON", "per.due_date = ?", today.plusDays(DUE_SOON_DAYS))
                + send("OVERDUE", "per.due_date = ?", today.minusDays(1));
    }

    private int send(String stage, String dateCondition, LocalDate date) {
        List<Due> due = jdbc.query("select c.id, c.subject_id,"
                + " c.amount - coalesce((select sum(p.amount) from payments p where p.charge_id = c.id), 0),"
                + " per.due_date, per.code from charges c join collection_periods per on per.id = c.period_id"
                + " where c.status = 'UNPAID' and " + dateCondition
                + " and not exists (select 1 from household_reminders r where r.charge_id = c.id and r.stage = ?)",
                (rs, i) -> new Due(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getDate(4).toLocalDate(), rs.getString(5)),
                Date.valueOf(date), stage);
        int sent = 0;
        for (Due d : due) {
            if (d.remaining() <= 0) {
                continue;
            }
            List<Long> accounts = jdbc.queryForList(
                    "select id from citizen_accounts where subject_id = ? and status = 'ACTIVE'", Long.class, d.subjectId());
            if (accounts.isEmpty()) {
                continue;
            }
            // Chạy song song (job 08:00 và xã bấm tay) thì chỉ giao dịch chèn được dòng mới gửi.
            if (jdbc.update("insert into household_reminders (charge_id, stage) values (?, ?) on conflict do nothing",
                    d.chargeId(), stage) != 1) {
                continue;
            }
            String money = NumberFormat.getIntegerInstance(Locale.of("vi", "VN")).format(d.remaining());
            String title = switch (stage) {
                case "OPEN" -> "Kỳ thu " + d.periodCode() + " đã mở";
                case "DUE_SOON" -> "Sắp đến hạn nộp phí kỳ " + d.periodCode();
                default -> "Đã quá hạn nộp phí kỳ " + d.periodCode();
            };
            String body = "Phí vệ sinh môi trường còn " + money + " đ, hạn nộp " + d.dueDate().format(DMY)
                    + ". Vui lòng nộp cho người đi thu hoặc thanh toán trong app.";
            for (Long citizenId : accounts) {
                notifications.publish(NotificationCommand.toCitizen(citizenId, NotificationKind.REMINDER, title, body,
                        Map.of("screen", "citizen.charges")),
                        null);
                sent++;
            }
        }
        return sent;
    }
}
