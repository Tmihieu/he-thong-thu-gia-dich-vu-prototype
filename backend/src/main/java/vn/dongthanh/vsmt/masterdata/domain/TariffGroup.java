package vn.dongthanh.vsmt.masterdata.domain;

/**
 * Nhóm giá cố định (D3) theo QĐ 65/2026, Đông Thạnh nhóm 2. Nhãn tiếng Việt ở frontend.
 * <ul>
 * <li>Hộ gia đình: {@link #HH_UP_TO_2}, {@link #HH_3_PLUS} đ/hộ/tháng; {@link #HH_PER_CAPITA} đ/người/tháng × số nhân khẩu.</li>
 * <li>Nguồn thải nhỏ chọn như hộ gia đình (được hỗ trợ phí xử lý): 3 bậc đ/tháng; {@link #BY_VOLUME} 500 đến dưới
 * 9.000 kg/tháng, đ/kg.</li>
 * <li>{@link #FULL_COST_BY_KG}: nguồn thải lớn và nguồn thải nhỏ đăng ký cân, đ/kg có phí xử lý (bảng mục 3).</li>
 * </ul>
 */
public enum TariffGroup {
    HH_UP_TO_2,
    HH_3_PLUS,
    HH_PER_CAPITA,
    SMALL_UP_TO_126,
    SMALL_126_TO_250,
    SMALL_250_TO_500,
    BY_VOLUME,
    FULL_COST_BY_KG;

    public boolean isHousehold() {
        return this == HH_UP_TO_2 || this == HH_3_PLUS || this == HH_PER_CAPITA;
    }

    /** Đơn giá đ/kg, nhân định mức kg/tháng của đăng ký. */
    public boolean isPerKg() {
        return this == BY_VOLUME || this == FULL_COST_BY_KG;
    }
}
