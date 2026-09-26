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
                "select username, role, company_id, status, password_hash from users"
                        + " where role in ('ADMIN', 'COMMUNE_OFFICER') order by username");

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

    @Test
    void demoProfileSeedsDistrictsAreasCompaniesAndCompanyAccounts() {
        assertThat(demoDb.queryForList("select code from districts order by sort_order", String.class))
                .containsExactly("DTH", "TTT", "NB");
        assertThat(demoDb.queryForObject("select count(*) from areas", Integer.class)).isEqualTo(24);
        assertThat(demoDb.queryForList(
                "select d.code from areas a join districts d on d.id = a.district_id"
                        + " where a.code in ('KV01', 'KV08', 'KV09', 'KV16', 'KV17', 'KV24') order by a.code",
                String.class)).containsExactly("DTH", "DTH", "TTT", "TTT", "NB", "NB");
        assertThat(demoDb.queryForList("select code from companies order by code", String.class))
                .hasSize(11).startsWith("DV01").endsWith("DV11");

        List<Map<String, Object>> companyUsers = demoDb.queryForList(
                "select u.username, c.code, u.password_hash from users u join companies c on c.id = u.company_id"
                        + " where u.role = 'COMPANY_MANAGER' order by u.username");
        assertThat(companyUsers).hasSize(11);
        assertThat(companyUsers).allSatisfy(r -> {
            assertThat(r.get("username")).isEqualTo(((String) r.get("code")).toLowerCase());
            assertThat(new BCryptPasswordEncoder().matches(DEMO_PASSWORD, (String) r.get("password_hash"))).isTrue();
        });
    }

    private static DataSource dataSource(String url) {
        return new DriverManagerDataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword());
    }
}
