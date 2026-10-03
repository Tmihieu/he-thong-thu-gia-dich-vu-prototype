package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import vn.dongthanh.vsmt.masterdata.domain.AddressText;

/** Chuẩn hóa để so khớp: gộp cách viết khác nhau của đường, nhưng không làm mất "/" hay hậu tố số nhà. */
class AddressTextTest {

    @Test
    void streetSpellingVariantsShareOneKey() {
        String key = AddressText.streetKey("Đường  Nguyễn Huệ");
        assertThat(key).isEqualTo("nguyen hue");
        assertThat(AddressText.streetKey("nguyễn huệ")).isEqualTo(key);
        assertThat(AddressText.streetKey("NGUYEN HUE ")).isEqualTo(key);
        assertThat(AddressText.streetKey("Hẻm 12")).isNotEqualTo(AddressText.streetKey("Đường 12"));
        assertThat(AddressText.streetKey(null)).isEmpty();
    }

    @Test
    void houseNumberKeepsSlashAndSuffix() {
        assertThat(AddressText.houseKey("12a")).isEqualTo("12A");
        assertThat(AddressText.houseKey(" 12 / 5 b ")).isEqualTo("12/5B");
        assertThat(AddressText.houseKey("Số 12/5")).isEqualTo("12/5");
        assertThat(AddressText.houseKey("12/5")).isNotEqualTo(AddressText.houseKey("12/5B"));
        assertThat(AddressText.houseKey("12")).isNotEqualTo(AddressText.houseKey("12/5"));
        assertThat(AddressText.houseKey("  ")).isEmpty();
        assertThat(AddressText.houseKey(null)).isEmpty();
    }

    @Test
    void unitIgnoresCaseAndSpaces() {
        assertThat(AddressText.unitKey("p 101")).isEqualTo("P101");
        assertThat(AddressText.unitKey(null)).isEmpty();
    }
}
