package vn.dongthanh.vsmt.platform.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

/** Thiếu hoặc quá ngắn JWT_SECRET thì context không khởi động. */
class JwtPropertiesTest {

    @Configuration
    @EnableConfigurationProperties(JwtProperties.class)
    static class Config {
    }

    final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class))
            .withUserConfiguration(Config.class);

    @Test
    void missingSecretFailsStartup() {
        runner.run(ctx -> {
            assertThat(ctx).hasFailed();
            assertThat(ctx.getStartupFailure()).rootCause().hasMessageContaining("vsmt.jwt.secret");
        });
    }

    @Test
    void shortSecretFailsStartup() {
        runner.withPropertyValues("vsmt.jwt.secret=qua-ngan").run(ctx -> {
            assertThat(ctx).hasFailed();
            assertThat(ctx.getStartupFailure()).rootCause().hasMessageContaining("ít nhất 32 ký tự");
        });
    }

    @Test
    void validSecretStartsWithDefaults() {
        runner.withPropertyValues("vsmt.jwt.secret=0123456789abcdef0123456789abcdef").run(ctx -> {
            assertThat(ctx).hasNotFailed();
            JwtProperties props = ctx.getBean(JwtProperties.class);
            assertThat(props.accessTokenTtl()).isEqualTo(Duration.ofHours(8));
            assertThat(props.issuer()).isEqualTo("vsmt");
            assertThat(props.toString()).doesNotContain("0123456789abcdef");
        });
    }
}
