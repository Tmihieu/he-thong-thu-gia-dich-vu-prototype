package vn.dongthanh.vsmt.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.domain.UserStatus;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
class UserRepositoryIT extends IntegrationTest {

    static final String HASH = "$2a$10$abcdefghijklmnopqrstuuSRwJqgqEovZ7rLlJ9mOp1mEXAMPLE";

    @Autowired
    UserRepository users;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void savesAndFindsByUsername() {
        User saved = users.saveAndFlush(User.create("canbo_test", "Nguyễn Văn Thử", Role.COMMUNE_OFFICER, null, HASH));

        User found = users.findByUsername("canbo_test").orElseThrow();

        assertThat(found.getId()).isEqualTo(saved.getId());
        assertThat(found.getFullName()).isEqualTo("Nguyễn Văn Thử");
        assertThat(found.getRole()).isEqualTo(Role.COMMUNE_OFFICER);
        assertThat(found.getCompanyId()).isNull();
        assertThat(found.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(found.getCreatedAt()).isNotNull();
        assertThat(found.getUpdatedAt()).isNotNull();
        assertThat(users.existsByUsername("canbo_test")).isTrue();
        assertThat(users.findByUsername("khong_co")).isEmpty();
    }

    @Test
    void testProfileDoesNotLoadDemoSeed() {
        assertThat(users.findByUsername("admin")).isEmpty();
        assertThat(users.findByUsername("canbo_xa")).isEmpty();
    }

    @Test
    void duplicateUsernameIsRejectedByUniqueConstraint() {
        users.saveAndFlush(User.create("trung_ten", "Người A", Role.ADMIN, null, HASH));

        assertThatThrownBy(() -> users.saveAndFlush(User.create("trung_ten", "Người B", Role.ADMIN, null, HASH)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uq_users_username");
    }

    @Test
    void companyRoleWithoutCompanyIsRejectedByCheck() {
        assertThatThrownBy(() -> insertRaw("thu_ngan", "COLLECTOR", null))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_users_company_by_role");
    }

    @Test
    void communeRoleWithCompanyIsRejectedByCheck() {
        assertThatThrownBy(() -> insertRaw("canbo_cty", "COMMUNE_OFFICER", 1L))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_users_company_by_role");
    }

    @Test
    void usernameMustBeLowercaseWithoutDiacritics() {
        assertThatThrownBy(() -> insertRaw("CanBo_Xã", "ADMIN", null))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_users_username_format");
    }

    @Test
    void unknownRoleIsRejected() {
        assertThatThrownBy(() -> insertRaw("nguoi_dan", "CITIZEN", null))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_users_role");
    }

    @Test
    void factoryEnforcesCompanyRule() {
        assertThatThrownBy(() -> User.create("dv01", "Công ty", Role.COMPANY_MANAGER, null, HASH))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> User.create("admin2", "Quản trị", Role.ADMIN, 1L, HASH))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(User.create("dv01", "Công ty", Role.COMPANY_MANAGER, 1L, HASH).getCompanyId()).isEqualTo(1L);
    }

    private void insertRaw(String username, String role, Long companyId) {
        jdbc.update("insert into users (username, full_name, role, company_id, password_hash) values (?, ?, ?, ?, ?)",
                username, "Thử", role, companyId, HASH);
    }
}
