package vn.dongthanh.vsmt.platform.security;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cấu hình JWT. {@code secret} lấy từ biến môi trường {@code JWT_SECRET}; thiếu hoặc ngắn hơn
 * 32 ký tự (256 bit cho HS256) thì ứng dụng không khởi động.
 */
@Validated
@ConfigurationProperties("vsmt.jwt")
public record JwtProperties(
        @NotBlank(message = "Thiếu JWT_SECRET") @Size(min = 32, message = "JWT_SECRET phải có ít nhất 32 ký tự") String secret,
        @NotNull @DefaultValue("8h") Duration accessTokenTtl,
        @NotBlank @DefaultValue("vsmt") String issuer) {

    @Override
    public String toString() {
        return "JwtProperties[secret=***, accessTokenTtl=" + accessTokenTtl + ", issuer=" + issuer + "]";
    }
}
