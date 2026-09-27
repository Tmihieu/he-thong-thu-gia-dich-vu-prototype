package vn.dongthanh.vsmt.citizen.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class PhoneNumbersTest {

    @ParameterizedTest
    @CsvSource({
            "0902000128, 0902000128",
            "'0902 000 128', 0902000128",
            "090.200.0128, 0902000128",
            "+84902000128, 0902000128",
            "'+84 902-000-128', 0902000128",
            "84902000128, 0902000128",
            "(028) 3812 3456, 02838123456"})
    void normalizesCommonVietnameseFormats(String raw, String expected) {
        assertThat(PhoneNumbers.normalize(raw)).contains(expected);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "abc", "123456789", "090200012", "090200012345", "+1 202 555 0100"})
    void rejectsInvalid(String raw) {
        assertThat(PhoneNumbers.normalize(raw)).isEmpty();
    }
}
