package vn.dongthanh.vsmt.masterdata.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class PeriodAutoScheduler {

    private final PeriodAutoService service;

    @Scheduled(cron = "0 30 7 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runDaily() {
        try {
            var result = service.createDraftIfDue(null);
            if (result.created() != null) {
                log.info("Tự tạo kỳ thu: {}", result.message());
            }
        } catch (RuntimeException exception) {
            log.error("Không tạo được kỳ thu tự động", exception);
        }
    }
}
