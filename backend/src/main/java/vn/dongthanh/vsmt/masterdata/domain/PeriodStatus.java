package vn.dongthanh.vsmt.masterdata.domain;

/** Vòng đời kỳ thu: mở kỳ là Đang thu luôn (không có bước "Bắt đầu thu", người dùng chốt 28/09/2026) → Đã khóa. */
public enum PeriodStatus {
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
