package vn.dongthanh.vsmt.masterdata.domain;

/**
 * Loại đối tượng theo Điều 3 QĐ 65/2026: nguồn thải nhỏ / lớn theo khoản 1 / 2 Điều 58 NĐ 08/2022 (lớn từ 300 kg/ngày,
 * tức 9.000 kg/tháng); chủ nhà trọ cũng xếp nhỏ / lớn theo khối lượng.
 */
public enum SubjectType {
    HOUSEHOLD,
    SMALL_SOURCE,
    LARGE_SOURCE;

    /** Tiền tố mã đối tượng và số chữ số theo sau (tổng 7 ký tự sau dấu gạch). Mã cũ KD / DN giữ nguyên. */
    public String codePrefix() {
        return switch (this) {
            case HOUSEHOLD -> "H";
            case SMALL_SOURCE -> "NN";
            case LARGE_SOURCE -> "NL";
        };
    }

    /**
     * Nhóm giá dùng được: hộ gia đình theo số người hoặc nhân khẩu; nguồn thải nhỏ theo QĐ (bậc kg, 633 đ/kg) hoặc đăng
     * ký cân như nguồn thải lớn; nguồn thải lớn chỉ cân.
     */
    public boolean allows(TariffGroup group) {
        return switch (this) {
            case HOUSEHOLD -> group.isHousehold();
            case SMALL_SOURCE -> !group.isHousehold();
            case LARGE_SOURCE -> group == TariffGroup.FULL_COST_BY_KG;
        };
    }
}
