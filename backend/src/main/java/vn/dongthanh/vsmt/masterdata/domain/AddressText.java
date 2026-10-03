package vn.dongthanh.vsmt.masterdata.domain;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Chuẩn hóa chuỗi địa chỉ để so khớp (không dùng để hiển thị hay lưu thay giá trị gốc). */
public final class AddressText {

    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern SPACES = Pattern.compile("\\s+");
    private static final Pattern AROUND_SLASH = Pattern.compile("\\s*/\\s*");
    private static final Pattern HOUSE_PREFIX = Pattern.compile("^(SỐ|SO|NO)\\.?\\s+");

    private AddressText() {
    }

    /** Bỏ dấu, hạ chữ thường, gộp khoảng trắng, bỏ tiền tố "đường": "Đường  Nguyễn Huệ" → "nguyen hue". */
    public static String streetKey(String name) {
        if (name == null) {
            return "";
        }
        String s = MARKS.matcher(Normalizer.normalize(name.trim().toLowerCase(Locale.ROOT).replace('đ', 'd'),
                Normalizer.Form.NFD)).replaceAll("");
        s = SPACES.matcher(s).replaceAll(" ").trim();
        return s.startsWith("duong ") ? s.substring(6).trim() : s;
    }

    /**
     * Số nhà chuẩn hóa: chữ hoa, gộp khoảng trắng, bỏ tiền tố "Số"; GIỮ dấu "/" và hậu tố ("12/5B" ≠ "12/5").
     * Rỗng nghĩa là nhà chưa có số.
     */
    public static String houseKey(String houseNo) {
        if (houseNo == null) {
            return "";
        }
        String s = SPACES.matcher(houseNo.trim().toUpperCase(Locale.ROOT)).replaceAll(" ");
        s = HOUSE_PREFIX.matcher(s).replaceFirst("");
        return AROUND_SLASH.matcher(s).replaceAll("/").replaceAll("\\s+", "");
    }

    /** Phòng/căn chuẩn hóa như số nhà (không bỏ tiền tố). */
    public static String unitKey(String unitNo) {
        return unitNo == null ? "" : SPACES.matcher(unitNo.trim().toUpperCase(Locale.ROOT)).replaceAll("");
    }
}
