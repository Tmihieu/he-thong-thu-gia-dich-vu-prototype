package vn.dongthanh.vsmt.platform.domain;

/**
 * Vai trò nội bộ. Người dân không phải {@code User} mà dùng {@code CitizenAccount} (G8).
 * Nhãn tiếng Việt nằm ở frontend.
 */
public enum Role {
    COMMUNE_OFFICER,
    COMPANY_MANAGER,
    COLLECTOR,
    ADMIN,
    /** Lãnh đạo: xem toàn hệ thống, duyệt đề nghị miễn giảm / hoàn / xóa nợ; không ghi nghiệp vụ khác (SPEC §9.10). */
    LEADER;

    /** Vai trò thuộc một công ty, bắt buộc có {@code companyId}. */
    public boolean belongsToCompany() {
        return this == COMPANY_MANAGER || this == COLLECTOR;
    }
}
