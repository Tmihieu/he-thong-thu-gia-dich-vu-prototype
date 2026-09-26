package vn.dongthanh.vsmt.support;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** "Hôm nay" cố định 01/10/2026 (giờ Việt Nam) cho integration test cần xét ngày phát hành, phân công, hạn. */
@TestConfiguration
public class FixedClockConfig {

    public static final Instant NOW = Instant.parse("2026-10-01T02:00:00Z");

    @Bean
    @Primary
    Clock fixedClock() {
        return Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
