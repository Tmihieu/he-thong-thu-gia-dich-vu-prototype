package vn.dongthanh.vsmt.platform;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import vn.dongthanh.vsmt.remittance.service.LedgerQueries;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyAmount;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyPeriodAmount;
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
        assertThat(demoDb.queryForObject("select count(*) from areas", Integer.class)).isEqualTo(52);
        assertThat(demoDb.queryForList(
                "select d.code from areas a join districts d on d.id = a.district_id"
                        + " where a.code in ('AP02', 'AP22', 'AP27', 'AP42', 'AP47', 'AP48') order by a.code",
                String.class)).containsExactly("TTT", "TTT", "DTH", "DTH", "DTH", "NB");
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
    void demoProfileSeedsTariffQd65WithAllGroupsAndFeeTypes() {
        assertThat(demoDb.queryForList("select code || ':' || status from tariff_versions order by valid_from",
                String.class)).containsExactly("BG-67-2025:EXPIRED", "BG-65-2026:ACTIVE");

        List<Map<String, Object>> rates = demoDb.queryForList("""
                select r.tariff_group, r.collection_fee, r.transport_fee, r.monthly_total
                from tariff_rates r join tariff_versions v on v.id = r.tariff_version_id
                where v.code = 'BG-65-2026' order by r.monthly_total, r.tariff_group""");
        assertThat(rates).extracting(r -> r.get("tariff_group"))
                .containsExactly("BY_VOLUME", "HH_UP_TO_2", "HH_3_PLUS", "SMALL_UP_TO_126", "SMALL_126_TO_250",
                        "SMALL_250_TO_500");
        assertThat(rates).extracting(r -> ((Number) r.get("monthly_total")).longValue())
                .containsExactly(633L, 40_000L, 80_000L, 80_000L, 119_000L, 238_000L);
        assertThat(rates).allSatisfy(r -> assertThat(((Number) r.get("monthly_total")).longValue())
                .isEqualTo(((Number) r.get("collection_fee")).longValue() + ((Number) r.get("transport_fee")).longValue()));

        assertThat(demoDb.queryForList("select code from fee_types order by code", String.class))
                .containsExactly("ENV", "EXTRA");
    }

    @Test
    void demoProfileSeedsAreaAssignmentsWithAp47Unassigned() {
        assertThat(demoDb.queryForObject("select count(*) from area_assignments", Integer.class)).isEqualTo(51);
        assertThat(demoDb.queryForObject("""
                select count(*) from area_assignments aa join areas a on a.id = aa.area_id where a.code = 'AP47'""",
                Integer.class)).isZero();
        assertThat(demoDb.queryForList("""
                select a.code from area_assignments aa join areas a on a.id = aa.area_id
                join companies c on c.id = aa.company_id where c.code = 'DV03' order by a.code""", String.class))
                .contains("AP11", "AP13", "AP31");
        // Mọi ấp trừ Ấp 47 đều có công ty (28 ấp mới chia vòng cho 11 công ty ở V40_2).
        assertThat(demoDb.queryForList("""
                select a.code from areas a
                where not exists (select 1 from area_assignments aa where aa.area_id = a.id)""", String.class))
                .containsExactly("AP47");
        assertThat(demoDb.queryForObject("select count(distinct company_id) from area_assignments", Integer.class))
                .isEqualTo(11);
    }

    @Test
    void demoProfileSeedsFakeSubjectsWithAllCases() {
        int total = demoDb.queryForObject("select count(*) from service_subjects", Integer.class);
        assertThat(total).isBetween(150, 500);
        assertThat(demoDb.queryForList("""
                select a.code || ':' || s.status || ':' || c.tariff_group from service_subjects s
                join areas a on a.id = s.area_id join service_contracts c on c.subject_id = s.id
                where s.code = 'DTH-H000128'""", String.class)).containsExactly("AP39:ACTIVE:HH_3_PLUS");
        assertThat(demoDb.queryForObject("select count(*) from service_contracts where exempt", Integer.class)).isPositive();
        assertThat(demoDb.queryForObject("""
                select count(*) from service_subjects s where s.status = 'PENDING'
                and not exists (select 1 from service_contracts c where c.subject_id = s.id)""", Integer.class)).isPositive();
        assertThat(demoDb.queryForObject("""
                select count(*) from service_subjects s join service_contracts c on c.subject_id = s.id
                where s.status = 'ENDED' and c.valid_to is not null""", Integer.class)).isPositive();
        assertThat(demoDb.queryForList("select distinct subject_type from service_subjects order by 1", String.class))
                .containsExactly("BUSINESS_HOUSEHOLD", "ENTERPRISE", "HOUSEHOLD");
        assertThat(demoDb.queryForObject("select count(distinct area_id) from service_subjects", Integer.class)).isEqualTo(52);
        // Không có SĐT trùng giữa các hộ (SĐT dùng để gắn tài khoản app người dân).
        assertThat(demoDb.queryForObject("select count(*) - count(distinct phone) from service_subjects", Integer.class)).isZero();
    }

    @Test
    void demoProfileSeedsCollectorsWithoutAreaAssignments() {
        assertThat(demoDb.queryForObject("select count(*) from users where role = 'COLLECTOR'", Integer.class)).isEqualTo(51);
        // Ấp thêm mới (V40_2) có người thu thuap{số ấp}; phân tổ đã bỏ (V44), người thu thuộc công ty qua users.company_id.
        assertThat(demoDb.queryForObject("select count(*) from users where username like 'thuap%'", Integer.class))
                .isEqualTo(28);
        assertThat(demoDb.queryForObject("""
                select c.code from users u join companies c on c.id = u.company_id where u.username = 'thu07'""",
                String.class)).isEqualTo("DV01");
        assertThat(demoDb.queryForObject("select count(*) from information_schema.tables where table_name in"
                + " ('collector_assignments', 'collection_schedules')", Integer.class)).isZero();
        assertThat(demoDb.queryForObject("select count(*) from information_schema.columns where table_name = 'areas'"
                + " and column_name in ('latitude', 'longitude')", Integer.class)).isZero();
        assertThat(demoDb.queryForObject("select count(*) from users where username = 'thu24'", Integer.class)).isZero();
    }

    @Test
    void demoProfileSeedsCitizenAccountsForDemoHouseholdAndOtherCases() {
        assertThat(demoDb.queryForList("""
                select c.phone || ':' || s.code from citizen_accounts c join service_subjects s on s.id = c.subject_id
                where s.code = 'DTH-H000128' order by c.phone""", String.class))
                .containsExactly("0902000128:DTH-H000128", "0903000128:DTH-H000128");
        assertThat(demoDb.queryForList("""
                select s.code from citizen_accounts c join service_subjects s on s.id = c.subject_id
                order by s.code, c.phone""", String.class))
                .containsExactly("DTH-H000128", "DTH-H000128", "DTH-H000149", "NB-H000341", "TTT-H000161",
                        "TTT-H000221");
        // DTH-H000149 là hộ miễn 100% (tổ KV08 cũ = Ấp 42, j = 9 trong V7_1).
        assertThat(demoDb.queryForObject("""
                select c.exempt from service_contracts c join service_subjects s on s.id = c.subject_id
                where s.code = 'DTH-H000149'""", Boolean.class)).isTrue();
        assertThat(demoDb.queryForObject("select count(*) from citizen_accounts where status <> 'ACTIVE'",
                Integer.class)).isZero();
    }

    @Test
    void demoProfileSeedsMarketPostsAndComments() {
        // Seed gắn người đăng theo SĐT: SĐT lệch thì dòng bị bỏ im lặng, nên đếm đủ bài và bình luận.
        assertThat(demoDb.queryForList("select code || ':' || status from market_posts order by code", String.class))
                .containsExactly("CDC-033:CLOSED", "CDC-035:OPEN", "CDC-039:OPEN", "CDC-041:OPEN",
                        // V37_1: thêm bài cho feed và màn kiểm duyệt (CDC-048, CDC-049 chờ duyệt).
                        "CDC-042:OPEN", "CDC-043:OPEN", "CDC-044:OPEN", "CDC-045:OPEN", "CDC-046:OPEN",
                        "CDC-047:OPEN", "CDC-048:OPEN", "CDC-049:OPEN");
        // CDC-035 của hộ kịch bản demo để thử đóng bài (D9).
        assertThat(demoDb.queryForObject("""
                select s.code from market_posts p join citizen_accounts a on a.id = p.author_id
                join service_subjects s on s.id = a.subject_id where p.code = 'CDC-035'""", String.class))
                .isEqualTo("DTH-H000128");
        assertThat(demoDb.queryForObject("select count(*) from market_comments", Integer.class)).isEqualTo(3);
        // V25 nâng cấp dữ liệu cũ: caption = title + 2 xuống dòng + mô tả, không lấy địa điểm nhận; post_type → tag;
        // danh mục OTHER, tổ của hộ, không chia sẻ SĐT.
        assertThat(demoDb.queryForList("""
                select p.code || ':' || string_agg(t.tag, ',') || ':' || p.category || ':' || p.share_phone
                    || ':' || (p.area_id = s.area_id) || ':' || (p.caption = p.title || E'\\n\\n' || p.description)
                    || ':' || (position(coalesce(p.pickup_location, '#') in p.caption) = 0)
                from market_posts p join market_post_tags t on t.post_id = p.id
                join citizen_accounts a on a.id = p.author_id join service_subjects s on s.id = a.subject_id
                where p.title is not null
                group by p.id, s.area_id order by p.code""", String.class))
                .containsExactly("CDC-033:GIVE:OTHER:false:true:true:true", "CDC-035:GIVE:OTHER:false:true:true:true",
                        "CDC-039:EXCHANGE:OTHER:false:true:true:true", "CDC-041:GIVE:OTHER:false:true:true:true");
    }

    @Test
    void demoProfileSeedsOverdueOldPeriodWhereDv01StillOwes() {
        // Chỉ kỳ cũ 09/2026; kỳ 10/2026 để §10 bước 1 mở.
        assertThat(demoDb.queryForList("select code || ':' || status || ':' || due_date from collection_periods",
                String.class)).containsExactly("2026-09:COLLECTING:2026-09-25");
        long dv01 = demoDb.queryForObject("select id from companies where code = 'DV01'", Long.class);
        long period = demoDb.queryForObject("select id from collection_periods where code = '2026-09'", Long.class);

        // Chính các truy vấn sổ công ty–kỳ dùng. Số liệu DV01 (V22_1) không đổi khi V40_3 thêm khoản cho 10 công ty khác.
        LedgerQueries ledger = new LedgerQueries(demoDb);
        assertThat(ledger.dueByCompany(period)).hasSize(11).contains(new CompanyAmount(dv01, 1_319_000, 19));
        // Đã thu 609.000; V41_1 (nếu có) coi hộ đóng trước một phần DTH-H000125 là đóng đủ nên cộng thêm 30.000.
        assertThat(ledger.collectedByCompany(period)).filteredOn(c -> c.companyId() == dv01)
                .extracting(CompanyAmount::amount).singleElement().isIn(609_000L, 639_000L);
        long received = demoDb.queryForObject(
                "select sum(amount) from company_receipts where company_id = ? and period_id = ?", Long.class, dv01, period);
        // QĐ-L16: V34_1 hạ phiếu mẫu về 200.000 đ để còn phải nộp dương sau phần cầm lại.
        assertThat(received).isEqualTo(200_000L);
        // Như CompanyLedgerService.overdueDebtsOf (nhắc nộp, R16, BR-REM-03): kỳ có hạn trước hôm nay, còn nợ =
        // phải thu − phần thu gom công ty cầm lại − đã nộp. Đúng cả lúc làm seed lẫn ngày demo.
        for (LocalDate today : List.of(LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 21))) {
            long retained = ledger.retainedByCompanyAndPeriodBefore(today).stream()
                    .filter(r -> r.companyId() == dv01 && r.periodId() == period).mapToLong(CompanyPeriodAmount::amount).sum();
            assertThat(ledger.dueByCompanyAndPeriodBefore(today)).filteredOn(d -> d.companyId() == dv01)
                    .map(d -> new CompanyPeriodAmount(d.companyId(), d.periodId(), d.amount() - retained - received))
                    .containsExactly(new CompanyPeriodAmount(dv01, period, 1_319_000 - retained - received));
            // Phiếu mẫu phải nhỏ hơn phải nộp xã, để demo hiện "Đang nộp" chứ không âm (QĐ-L16).
            assertThat(1_319_000 - retained - received).isPositive();
        }

        // Khoản Đã thu đúng khi Σ thanh toán = số tiền, không thu vượt (G4); hộ kịch bản đã đóng kỳ cũ.
        assertThat(demoDb.queryForObject("""
                select count(*) from charges c
                cross join lateral (select coalesce(sum(p.amount), 0) as paid from payments p where p.charge_id = c.id) t
                where t.paid > c.amount or (c.status <> 'EXEMPT' and (c.status = 'PAID') <> (t.paid = c.amount))""",
                Integer.class)).isZero();
        assertThat(demoDb.queryForObject("select status from charges where code = 'KT-0926-DTH-H000128'", String.class))
                .isEqualTo("PAID");
        // Người đi thu đã bàn giao hết tiền mặt kỳ cũ (R21) nên bước 3 bàn giao bắt đầu từ 0.
        assertThat(demoDb.queryForList("""
                select u.username || ':' || (
                    coalesce((select sum(p.amount) from payments p where p.collector_id = u.id and p.method = 'CASH'), 0)
                    - coalesce((select sum(h.amount) from cash_handovers h where h.collector_id = u.id), 0))
                from users u where u.username in ('thu07', 'thu09') order by u.username""", String.class))
                .containsExactly("thu07:0", "thu09:0");
        // Thao tác tiền của seed có nhật ký như khi làm qua service.
        assertThat(demoDb.queryForList("select action from audit_logs order by id limit 13", String.class)).containsExactly(
                "OPEN_PERIOD", "ISSUE_CHARGE_REQUEST", "RECORD_PAYMENT", "RECORD_PAYMENT", "RECORD_PAYMENT",
                "RECORD_PAYMENT", "RECORD_PAYMENT", "RECORD_PAYMENT", "RECORD_PAYMENT", "RECORD_PAYMENT",
                "RECEIVE_CASH_HANDOVER", "RECEIVE_CASH_HANDOVER", "ISSUE_COMPANY_RECEIPT");
        // Cùng khóa JSON như CollectionService/ChargeRequestService ghi, để màn Nhật ký hiện như dòng thật.
        assertThat(demoDb.queryForObject("""
                select count(*) from audit_logs where action = 'RECORD_PAYMENT'
                and before_data ? 'chargeAmount' and after_data ? 'chargeAmount' and after_data ? 'paymentAmount'
                and not after_data ? 'amount'""", Integer.class)).isGreaterThanOrEqualTo(8);
        assertThat(demoDb.queryForObject(
                "select after_data ->> 'company' from audit_logs where entity_id = 'YCT-0926-01'", String.class))
                .isEqualTo("DV01");
    }

    @Test
    void demoProfileSeedsPeriod0926ForEveryCompanyWithVariedProgress() {
        long period = demoDb.queryForObject("select id from collection_periods where code = '2026-09'", Long.class);
        // Mọi công ty có khoản kỳ 09 (DV01 từ V22_1, 10 công ty còn lại từ V40_3); Ấp 47 chưa có công ty nên không có khoản.
        assertThat(demoDb.queryForObject("select count(distinct company_id) from charges where period_id = ?",
                Integer.class, period)).isEqualTo(11);
        assertThat(demoDb.queryForObject("""
                select count(*) from charges c join areas a on a.id = c.area_id where a.code = 'AP47'""", Integer.class))
                .isZero();
        // Xã có tài khoản nhận chuyển khoản tạm (V43_1) để màn người đi thu và app hiện VietQR.
        assertThat(demoDb.queryForObject("select count(*) from commune_bank_account", Integer.class)).isEqualTo(1);

        // Sổ công ty có đủ trạng thái: DV02 và DV11 thu đủ 100%, DV10 dưới 45%, DV06 và DV10 chưa nộp đồng nào.
        LedgerQueries ledger = new LedgerQueries(demoDb);
        long fullyCollected = ledger.dueByCompany(period).stream().filter(due -> ledger.collectedByCompany(period).stream()
                .anyMatch(c -> c.companyId() == due.companyId() && c.amount() == due.amount())).count();
        assertThat(fullyCollected).isEqualTo(2);
        assertThat(demoDb.queryForObject("select count(*) from company_receipts where period_id = ?", Integer.class,
                period)).isEqualTo(14);
        assertThat(demoDb.queryForList("""
                select co.code from companies co where not exists (select 1 from company_receipts r where r.company_id = co.id)
                order by co.code""", String.class)).containsExactly("DV06", "DV10");

        // Chuyển khoản qua QR (V40_3; thanh toán TRANSFER của V22_1 ghi tay): mỗi thanh toán TRANSFER có đúng một dòng ngân hàng đã khớp, đúng tài khoản và mã khoản.
        assertThat(demoDb.queryForObject("""
                select count(*) from payments p where p.method = 'TRANSFER' and p.code > 'TT-0926-000008'
                and not exists (select 1 from bank_transfers b join charges c on c.id = p.charge_id
                    where b.payment_id = p.id and b.status = 'MATCHED'
                    and b.account_number = (select account_number from commune_bank_account) and b.amount = p.amount
                    and b.code = 'VSMT' || lpad(c.id::text, 6, '0'))""", Integer.class)).isZero();
        assertThat(demoDb.queryForList("select distinct reason from bank_transfers where status = 'UNMATCHED' order by 1",
                String.class)).containsExactly("AMOUNT_MISMATCH", "CHARGE_NOT_COLLECTABLE", "NO_CODE", "WRONG_ACCOUNT");

        // Không người thu nào bàn giao quá số tiền mặt đã thu (R21).
        assertThat(demoDb.queryForObject("""
                select count(*) from users u where u.role = 'COLLECTOR' and
                coalesce((select sum(h.amount) from cash_handovers h where h.collector_id = u.id), 0) >
                coalesce((select sum(p.amount) from payments p where p.collector_id = u.id and p.method = 'CASH'), 0)""",
                Integer.class)).isZero();
        // Hộ có tài khoản app còn nợ kỳ 09 (DV01 đã đóng ở V22_1, DTH-H000149 được miễn) để thử đóng online.
        assertThat(demoDb.queryForList("""
                select c.code from charges c where c.status = 'UNPAID' and c.code like 'KT-0926-%'
                  and c.subject_id in (select subject_id from citizen_accounts) order by c.code""", String.class))
                .containsExactly("KT-0926-NB-H000341", "KT-0926-TTT-H000221");
    }

    private static DataSource dataSource(String url) {
        return new DriverManagerDataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword());
    }
}
