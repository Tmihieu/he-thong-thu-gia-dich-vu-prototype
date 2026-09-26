package vn.dongthanh.vsmt.platform.common;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import vn.dongthanh.vsmt.VsmtApplication;

/** Đồng hồ hệ thống theo giờ Việt Nam; test thay bằng đồng hồ cố định để kiểm soát "hôm nay". */
@Configuration
public class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.system(ZoneId.of(VsmtApplication.TIME_ZONE));
    }
}
