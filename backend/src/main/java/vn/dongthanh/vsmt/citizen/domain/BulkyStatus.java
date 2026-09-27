package vn.dongthanh.vsmt.citizen.domain;

/** Chờ xác nhận → Đã báo phí → Đã thu gom; Hủy được từ Chờ xác nhận hoặc Đã báo phí. */
public enum BulkyStatus {
    PENDING("Chờ xác nhận"),
    QUOTED("Đã báo phí"),
    COLLECTED("Đã thu gom"),
    CANCELLED("Đã hủy");

    private final String label;

    BulkyStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
