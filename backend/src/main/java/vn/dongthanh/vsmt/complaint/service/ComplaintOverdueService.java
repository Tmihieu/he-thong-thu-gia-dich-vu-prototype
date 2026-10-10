package vn.dongthanh.vsmt.complaint.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.complaint.domain.Complaint;
import vn.dongthanh.vsmt.complaint.domain.ComplaintRepository;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.domain.Role;

/**
 * Nhắc khiếu nại quá hạn xử lý: mỗi ngày 08:00 báo xã và công ty đang giữ khiếu nại đã qua hạn (+3 ngày), mỗi khiếu nại
 * một lần. Trả lại xã rồi chuyển công ty khác thì được nhắc lại cho hạn mới.
 */
@Service
@RequiredArgsConstructor
public class ComplaintOverdueService {

    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ComplaintRepository complaints;
    private final NotificationService notifications;
    private final Clock clock;

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runDaily() {
        run();
    }

    /** Trả số khiếu nại vừa được nhắc. */
    @Transactional
    public int run() {
        List<Complaint> overdue = complaints.findOverdueNotNotified(LocalDate.now(clock));
        for (Complaint c : overdue) {
            String body = c.getSummary() + " · hạn " + c.getDeadline().format(DMY);
            notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.COMPLAINT,
                    "Khiếu nại " + c.getCode() + " quá hạn xử lý · " + c.getForwardedCompany().getCode(), body,
                    ComplaintService.link("commune.complaints", c)), null);
            notifications.publish(NotificationCommand.toCompany(c.getForwardedCompany().getId(), Role.COMPANY_MANAGER,
                    NotificationKind.COMPLAINT, "Khiếu nại " + c.getCode() + " đã quá hạn xử lý", body,
                    ComplaintService.link("company.complaints", c)), null);
            c.markOverdueNotified(OffsetDateTime.now(clock));
        }
        return overdue.size();
    }
}
