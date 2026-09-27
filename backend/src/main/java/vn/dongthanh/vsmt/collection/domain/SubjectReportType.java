package vn.dongthanh.vsmt.collection.domain;

/** Người đi thu báo hộ: Đã chuyển đi / Sai thông tin. Không lưu CSDL (G7), chỉ đi vào thông báo và nhật ký. */
public enum SubjectReportType {
    MOVED_AWAY("đã chuyển đi"),
    WRONG_INFO("sai thông tin");

    private final String label;

    SubjectReportType(String label) {
        this.label = label;
    }

    /** Nhãn tiếng Việt cho tiêu đề thông báo. */
    public String label() {
        return label;
    }
}
