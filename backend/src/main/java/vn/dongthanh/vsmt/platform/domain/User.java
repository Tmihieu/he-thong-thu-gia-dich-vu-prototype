package vn.dongthanh.vsmt.platform.domain;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/**
 * Tài khoản đăng nhập web của 4 vai trò nội bộ (data dictionary §2.1 User).
 * Ràng buộc "có công ty khi và chỉ khi vai trò thuộc công ty" nằm ở CHECK của bảng và ở {@link #create}.
 */
@Getter
@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 50)
    private String username;

    @Setter
    @Column(nullable = false, length = 100)
    private String fullName;

    @Setter
    @Column(length = 15)
    private String phone;

    @Setter
    @Column(length = 100)
    private String email;

    @Setter
    @Column(length = 100)
    private String organization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    private Long companyId;

    @Setter
    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserStatus status;

    @Setter
    private OffsetDateTime lastLoginAt;

    public static User create(String username, String fullName, Role role, Long companyId, String passwordHash) {
        if (role.belongsToCompany() != (companyId != null)) {
            throw new IllegalArgumentException("Vai trò " + role + " "
                    + (role.belongsToCompany() ? "bắt buộc" : "không được") + " gắn công ty");
        }
        User user = new User();
        user.username = username;
        user.fullName = fullName;
        user.role = role;
        user.companyId = companyId;
        user.passwordHash = passwordHash;
        user.status = UserStatus.ACTIVE;
        return user;
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }
}
