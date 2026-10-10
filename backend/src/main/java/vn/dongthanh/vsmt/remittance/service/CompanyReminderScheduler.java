package vn.dongthanh.vsmt.remittance.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class CompanyReminderScheduler {

    private final CompanyReminderAutoService service;

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runDaily() {
        try {
            service.runScheduled();
        } catch (RuntimeException exception) {
            log.error("Không gửi được nhắc nộp tự động cho công ty", exception);
        }
    }
}
