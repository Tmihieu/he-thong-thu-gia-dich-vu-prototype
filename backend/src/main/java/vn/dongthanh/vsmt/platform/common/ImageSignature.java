package vn.dongthanh.vsmt.platform.common;

/** Nhận dạng ảnh JPEG/PNG/WebP bằng magic bytes, không tin Content-Type hay đuôi file phía client gửi. */
public final class ImageSignature {

    private ImageSignature() {
    }

    /** Đuôi chuẩn ({@code jpg}, {@code png}, {@code webp}) hoặc {@code null} nếu không phải ảnh được hỗ trợ. */
    public static String extensionOf(byte[] b) {
        if (startsWith(b, 0, 0xFF, 0xD8, 0xFF)) {
            return "jpg";
        }
        if (startsWith(b, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
            return "png";
        }
        if (startsWith(b, 0, 'R', 'I', 'F', 'F') && startsWith(b, 8, 'W', 'E', 'B', 'P')) {
            return "webp";
        }
        return null;
    }

    private static boolean startsWith(byte[] b, int offset, int... magic) {
        if (b.length < offset + magic.length) {
            return false;
        }
        for (int i = 0; i < magic.length; i++) {
            if ((b[offset + i] & 0xFF) != magic[i]) {
                return false;
            }
        }
        return true;
    }
}
