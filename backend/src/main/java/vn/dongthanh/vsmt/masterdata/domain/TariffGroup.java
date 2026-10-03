package vn.dongthanh.vsmt.masterdata.domain;

/**
 * Nhóm giá cố định (D3) theo QĐ 65/2026. Nhãn tiếng Việt ở frontend.
 * Hộ gia đình và chủ nguồn thải nhỏ tính đ/tháng; {@link #BY_VOLUME} (chủ nguồn thải 500 đến dưới 9.000 kg/tháng) tính đ/kg.
 */
public enum TariffGroup {
    HH_UP_TO_2,
    HH_3_PLUS,
    SMALL_UP_TO_126,
    SMALL_126_TO_250,
    SMALL_250_TO_500,
    BY_VOLUME
}
