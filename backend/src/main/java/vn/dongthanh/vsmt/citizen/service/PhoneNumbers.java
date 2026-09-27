package vn.dongthanh.vsmt.citizen.service;

import java.util.Optional;
import java.util.regex.Pattern;

/** Chuẩn hóa SĐT Việt Nam người dân gõ vào: bỏ khoảng trắng/dấu, đổi {@code +84}/{@code 84} thành {@code 0}. */
final class PhoneNumbers {

    private static final Pattern NORMALIZED = Pattern.compile("0\\d{9,10}");

    private PhoneNumbers() {
    }

    static Optional<String> normalize(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String digits = raw.replaceAll("[\\s.()\\-]", "");
        if (digits.startsWith("+84")) {
            digits = "0" + digits.substring(3);
        } else if (digits.startsWith("84") && digits.length() >= 11) {
            digits = "0" + digits.substring(2);
        }
        return NORMALIZED.matcher(digits).matches() ? Optional.of(digits) : Optional.empty();
    }
}
