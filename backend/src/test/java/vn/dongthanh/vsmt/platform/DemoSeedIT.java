package vn.dongthanh.vsmt.platform;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * Chạy migration + seed của profile demo trên một CSDL riêng trong cùng container,
 * để seed không lẫn vào dữ liệu của các integration test khác.
 */
class DemoSeedIT extends IntegrationTest {

    static final String DEMO_PASSWORD = "Demo@2026"; // mật khẩu giả, ghi ở docs/demo-accounts.md

    static JdbcTemplate demoDb;

    @BeforeAll
    static void migrateDemoDatabase() {
        JdbcTemplate admin = new JdbcTemplate(dataSource(POSTGRES.getJdbcUrl()));
        admin.execute("drop database if exists vsmt_demo_seed");
        admin.execute("create database vsmt_demo_seed");

        DataSource demo = dataSource(POSTGRES.getJdbcUrl().replace("/" + POSTGRES.getDatabaseName(), "/vsmt_demo_seed"));
        Flyway.configure()
                .dataSource(demo)
                .locations("classpath:db/migration", "classpath:db/seed")
                .load()
                .migrate();
        demoDb = new JdbcTemplate(demo);
    }

    @Test
    void demoProfileSeedsAdminAndCommuneOfficerWithBcryptPasswords() {
        List<Map<String, Object>> rows = demoDb.queryForList(
                "select username, role, company_id, status, password_hash from users order by username");

        assertThat(rows).extracting(r -> r.get("username")).containsExactly("admin", "canbo_xa");
        assertThat(rows).extracting(r -> r.get("role")).containsExactly("ADMIN", "COMMUNE_OFFICER");
        assertThat(rows).allSatisfy(r -> {
            assertThat(r.get("company_id")).isNull();
            assertThat(r.get("status")).isEqualTo("ACTIVE");
            String hash = (String) r.get("password_hash");
            assertThat(hash).startsWith("$2a$10$").doesNotContain(DEMO_PASSWORD);
            assertThat(new BCryptPasswordEncoder().matches(DEMO_PASSWORD, hash)).isTrue();
        });
    }

    private static DataSource dataSource(String url) {
        return new DriverManagerDataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword());
    }
}
