package vn.dongthanh.vsmt.collection.domain;

/** Lý do người đi thu báo hộ về xã và công ty. Không lưu CSDL (G7), chỉ đi vào thông báo và nhật ký. */
public enum SubjectReportType {
    MOVED_AWAY("đã chuyển đi"),
    VACANT("nhà bỏ trống, không có người ở"),
    WRONG_INFO("sai thông tin hộ"),
    WRONG_MEMBERS("sai số thành viên / nhóm giá"),
    WRONG_AMOUNT("sai số tiền khoản thu"),
    DUPLICATE("trùng hộ / trùng khoản thu");

    private final String label;

    SubjectReportType(String label) {
        this.label = label;
    }

    /** Nhãn tiếng Việt cho tiêu đề thông báo. */
    public String label() {
        return label;
    }
}
