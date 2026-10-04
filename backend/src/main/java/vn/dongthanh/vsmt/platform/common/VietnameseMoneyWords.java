package vn.dongthanh.vsmt.platform.common;

/**
 * Đọc số tiền VND bằng chữ cho phiếu thu (R29), vd. 4200000 → "Bốn triệu hai trăm nghìn đồng".
 * Nhóm ba chữ số bằng 0 được bỏ qua; nhóm khác 0 không đứng đầu thì đọc đủ ("không trăm", "linh").
 */
public final class VietnameseMoneyWords {

    private static final String[] DIGITS = {"không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"};
    private static final String[] GROUPS = {"", " nghìn", " triệu"};
    private static final long BILLION = 1_000_000_000L;

    private VietnameseMoneyWords() {
    }

    public static String read(long amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("Số tiền âm");
        }
        String words = amount == 0 ? "không" : readNumber(amount, false);
        return Character.toUpperCase(words.charAt(0)) + words.substring(1) + " đồng";
    }

    private static String readNumber(long n, boolean full) {
        if (n >= BILLION) {
            String head = readNumber(n / BILLION, full) + " tỷ";
            long rest = n % BILLION;
            return rest == 0 ? head : head + " " + readBelowBillion(rest, true);
        }
        return readBelowBillion(n, full);
    }

    /** Đọc số dưới một tỷ; {@code full} = true khi đứng sau một nhóm lớn hơn (phải đọc đủ ba chữ số). */
    private static String readBelowBillion(long n, boolean full) {
        StringBuilder sb = new StringBuilder();
        boolean started = full;
        for (int g = 2; g >= 0; g--) {
            int group = (int) (n / pow1000(g) % 1000);
            if (group == 0) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(readGroup(group, started || !sb.isEmpty())).append(GROUPS[g]);
            started = true;
        }
        return sb.toString();
    }

    private static String readGroup(int n, boolean full) {
        int h = n / 100;
        int t = n / 10 % 10;
        int u = n % 10;
        StringBuilder sb = new StringBuilder();
        if (full || h > 0) {
            sb.append(DIGITS[h]).append(" trăm");
        }
        if (t == 0 && u > 0 && (h > 0 || full)) {
            sb.append(" linh");
        } else if (t == 1) {
            sb.append(" mười");
        } else if (t > 1) {
            sb.append(' ').append(DIGITS[t]).append(" mươi");
        }
        if (u > 0) {
            String unit = switch (u) {
                case 1 -> t > 1 ? "mốt" : "một";
                case 4 -> t > 1 ? "tư" : "bốn";
                case 5 -> t >= 1 ? "lăm" : "năm";
                default -> DIGITS[u];
            };
            sb.append(' ').append(unit);
        }
        return sb.toString().trim();
    }

    private static long pow1000(int g) {
        return g == 0 ? 1 : g == 1 ? 1_000 : 1_000_000;
    }
}
