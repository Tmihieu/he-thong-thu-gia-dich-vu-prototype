package vn.dongthanh.vsmt.platform.common;

import java.text.NumberFormat;
import java.util.Locale;

/** Định dạng tiền VND nguyên cho thông báo tiếng Việt: 1234567 → "1.234.567 đ". */
public final class Money {

    private Money() {
    }

    public static String format(long amount) {
        return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount) + " đ";
    }
}
