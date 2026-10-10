package vn.dongthanh.vsmt.remittance.service;

/** Trạng thái tính trên sổ công ty–kỳ; nhãn tiếng Việt ở frontend. */
public final class LedgerStatus {

    private LedgerStatus() {
    }

    /**
     * Tiến độ nộp tiền (R13): Chưa có công ty (dùng cho tiến độ theo tổ, T31) / Đã quyết toán / Quá hạn quyết toán /
     * Chưa nộp (chưa quyết toán).
     */
    public enum Progress {
        NO_COMPANY,
        PAID_IN_FULL,
        OVERDUE,
        NOT_PAID
    }

    /** Đối soát (R14): Khớp / Đang nộp (trong hạn còn thu rồi chưa nộp) / Lệch (hết hạn hoặc nợ kỳ trước). */
    public enum Reconciliation {
        MATCHED,
        PENDING,
        MISMATCH
    }
}
