package vn.dongthanh.vsmt.citizen.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Cấu hình app người dân. {@code demoOtp}: mã OTP cố định mô phỏng (O7), 4–8 chữ số. */
@Validated
@ConfigurationProperties("vsmt.citizen")
public record CitizenProperties(
        @NotBlank @Pattern(regexp = "\\d{4,8}", message = "demo-otp phải gồm 4–8 chữ số") String demoOtp) {
}
