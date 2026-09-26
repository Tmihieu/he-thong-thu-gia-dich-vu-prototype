package vn.dongthanh.vsmt.platform.domain;

/**
 * Vai trò nội bộ. Người dân không phải {@code User} mà dùng {@code CitizenAccount} (G8).
 * Nhãn tiếng Việt nằm ở frontend.
 */
public enum Role {
    COMMUNE_OFFICER,
    COMPANY_MANAGER,
    COLLECTOR,
    ADMIN;

    /** Vai trò thuộc một công ty, bắt buộc có {@code companyId}. */
    public boolean belongsToCompany() {
        return this == COMPANY_MANAGER || this == COLLECTOR;
    }
}
