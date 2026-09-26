package vn.dongthanh.vsmt.support;

import java.time.Instant;
import java.time.ZoneId;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * "Hôm nay" mặc định 01/10/2026 (giờ Việt Nam) cho integration test cần xét ngày phát hành, phân công, hạn.
 * Test cần ngày khác inject {@link MutableClock}, gọi {@code set} rồi {@code reset} khi xong.
 */
@TestConfiguration
public class FixedClockConfig {

    public static final Instant NOW = Instant.parse("2026-10-01T02:00:00Z");

    @Bean
    @Primary
    MutableClock fixedClock() {
        return new MutableClock(NOW, ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
