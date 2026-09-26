package vn.dongthanh.vsmt.masterdata.domain;

/** Vòng đời kỳ thu: Đã mở → Đang thu → Đã khóa, không quay lại. */
public enum PeriodStatus {
    OPEN("Đã mở"),
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
