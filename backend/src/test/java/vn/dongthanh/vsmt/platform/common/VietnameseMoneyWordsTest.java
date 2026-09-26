package vn.dongthanh.vsmt.platform.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

/** Đọc số tiền bằng chữ trên phiếu thu (R29). */
class VietnameseMoneyWordsTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "0|Không đồng",
            "5|Năm đồng",
            "10|Mười đồng",
            "15|Mười lăm đồng",
            "21|Hai mươi mốt đồng",
            "24|Hai mươi tư đồng",
            "25|Hai mươi lăm đồng",
            "101|Một trăm linh một đồng",
            "110|Một trăm mười đồng",
            "1000|Một nghìn đồng",
            "1005|Một nghìn không trăm linh năm đồng",
            "80000|Tám mươi nghìn đồng",
            "4200000|Bốn triệu hai trăm nghìn đồng",
            "1266000|Một triệu hai trăm sáu mươi sáu nghìn đồng",
            "1000001|Một triệu không trăm linh một đồng",
            "2000500000|Hai tỷ năm trăm nghìn đồng",
            "3000000000000|Ba nghìn tỷ đồng",
    })
    void readsAmountsInVietnamese(long amount, String expected) {
        assertThat(VietnameseMoneyWords.read(amount)).isEqualTo(expected);
    }

    @Test
    void negativeIsRejected() {
        assertThatThrownBy(() -> VietnameseMoneyWords.read(-1)).isInstanceOf(IllegalArgumentException.class);
    }
}
