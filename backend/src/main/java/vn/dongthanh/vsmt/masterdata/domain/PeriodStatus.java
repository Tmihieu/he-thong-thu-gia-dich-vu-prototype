package vn.dongthanh.vsmt.masterdata.domain;

/**
 * Vòng đời kỳ thu: mở kỳ là Đang thu luôn (không có bước "Bắt đầu thu", người dùng chốt 28/09/2026) → Đã khóa.
 * Kỳ do hệ thống tự tạo (04/10/2026) bắt đầu ở Dự thảo, chưa có khoản; cán bộ xã mở kỳ thì sang Đang thu.
 */
public enum PeriodStatus {
    DRAFT("Dự thảo"),
    COLLECTING("Đang thu"),
    LOCKED("Đã khóa");

    private final String label;

    PeriodStatus(String label) {
        this.label = label;
    }

    /** Nhãn tiếng Việt, chỉ dùng trong thông báo lỗi của backend. */
    public String label() {
        return label;
    }
}
