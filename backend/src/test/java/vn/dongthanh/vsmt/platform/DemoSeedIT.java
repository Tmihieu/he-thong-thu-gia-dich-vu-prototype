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

    @Test
    void demoProfileSeedsTariffQd65WithFourGroupsAndFeeTypes() {
        assertThat(demoDb.queryForList("select code || ':' || status from tariff_versions order by valid_from",
                String.class)).containsExactly("BG-67-2025:EXPIRED", "BG-65-2026:ACTIVE");

        List<Map<String, Object>> rates = demoDb.queryForList("""
                select r.tariff_group, r.collection_fee, r.processing_fee, r.monthly_total
                from tariff_rates r join tariff_versions v on v.id = r.tariff_version_id
                where v.code = 'BG-65-2026' order by r.monthly_total""");
        assertThat(rates).extracting(r -> r.get("tariff_group"))
                .containsExactly("HH_UP_TO_2", "HH_3_PLUS", "SMALL_GENERATOR", "BY_VOLUME");
        assertThat(rates).extracting(r -> ((Number) r.get("monthly_total")).longValue())
                .containsExactly(40_000L, 80_000L, 119_000L, 1_266_000L);
        assertThat(rates).allSatisfy(r -> assertThat(((Number) r.get("monthly_total")).longValue())
                .isEqualTo(((Number) r.get("collection_fee")).longValue() + ((Number) r.get("processing_fee")).longValue()));

        assertThat(demoDb.queryForList("select code from fee_types order by code", String.class))
                .containsExactly("ENV", "EXTRA");
    }

    @Test
    void demoProfileSeedsAreaAssignmentsWithKv24Unassigned() {
        assertThat(demoDb.queryForObject("select count(*) from area_assignments", Integer.class)).isEqualTo(23);
        assertThat(demoDb.queryForObject("""
                select count(*) from area_assignments aa join areas a on a.id = aa.area_id where a.code = 'KV24'""",
                Integer.class)).isZero();
        assertThat(demoDb.queryForList("""
                select a.code from area_assignments aa join areas a on a.id = aa.area_id
                join companies c on c.id = aa.company_id where c.code = 'DV03' order by a.code""", String.class))
                .containsExactly("KV03", "KV13", "KV14");
    }

    @Test
    void demoProfileSeedsFakeSubjectsWithAllCases() {
        int total = demoDb.queryForObject("select count(*) from service_subjects", Integer.class);
        assertThat(total).isBetween(150, 300);
        assertThat(demoDb.queryForList("""
                select a.code || ':' || s.status || ':' || c.tariff_group from service_subjects s
                join areas a on a.id = s.area_id join service_contracts c on c.subject_id = s.id
                where s.code = 'DTH-H000128'""", String.class)).containsExactly("KV07:ACTIVE:HH_3_PLUS");
        assertThat(demoDb.queryForObject("select count(*) from service_contracts where exempt", Integer.class)).isPositive();
        assertThat(demoDb.queryForObject("""
                select count(*) from service_subjects s where s.status = 'PENDING'
                and not exists (select 1 from service_contracts c where c.subject_id = s.id)""", Integer.class)).isPositive();
        assertThat(demoDb.queryForObject("""
                select count(*) from service_subjects s join service_contracts c on c.subject_id = s.id
                where s.status = 'ENDED' and c.valid_to is not null""", Integer.class)).isPositive();
        assertThat(demoDb.queryForList("select distinct subject_type from service_subjects order by 1", String.class))
                .containsExactly("BUSINESS_HOUSEHOLD", "ENTERPRISE", "HOUSEHOLD");
        assertThat(demoDb.queryForObject("select count(distinct area_id) from service_subjects", Integer.class)).isEqualTo(24);
        // Không có SĐT trùng giữa các hộ (SĐT dùng để gắn tài khoản app người dân).
        assertThat(demoDb.queryForObject("select count(*) - count(distinct phone) from service_subjects", Integer.class)).isZero();
    }

    @Test
    void demoProfileSeedsOneCollectorPerAssignedArea() {
        assertThat(demoDb.queryForObject("select count(*) from users where role = 'COLLECTOR'", Integer.class)).isEqualTo(23);
        assertThat(demoDb.queryForObject("select count(*) from collector_assignments", Integer.class)).isEqualTo(23);
        assertThat(demoDb.queryForObject("""
                select u.username || ':' || a.code || ':' || c.code from collector_assignments ca
                join users u on u.id = ca.collector_id join areas a on a.id = ca.area_id
                join companies c on c.id = ca.company_id where u.username = 'thu07'""", String.class))
                .isEqualTo("thu07:KV07:DV01");
        assertThat(demoDb.queryForObject("select count(*) from users where username = 'thu24'", Integer.class)).isZero();
    }

    private static DataSource dataSource(String url) {
        return new DriverManagerDataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword());
    }
}
