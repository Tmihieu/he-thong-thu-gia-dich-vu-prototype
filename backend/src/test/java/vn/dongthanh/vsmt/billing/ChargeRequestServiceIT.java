package vn.dongthanh.vsmt.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignment;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignmentRepository;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContractRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersionRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Viết trước (TDD) cho T18: xem trước = phát hành, phát hành lại không trùng, kỳ khóa, phân quyền, phạm vi. */
@Transactional
@Import(ChargeRequestServiceIT.FixedClock.class)
class ChargeRequestServiceIT extends IntegrationTest {

    /** "Hôm nay" cố định 01/10/2026 để phân công và hợp đồng xét đúng ngày phát hành. */
    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(Instant.parse("2026-10-01T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        }
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired DistrictRepository districts;
    @Autowired AreaRepository areas;
    @Autowired CompanyRepository companies;
    @Autowired AreaAssignmentRepository assignments;
    @Autowired TariffVersionRepository tariffs;
    @Autowired CollectionPeriodRepository periods;
    @Autowired FeeTypeRepository feeTypes;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired ServiceContractRepository contracts;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired EntityManager em;

    CollectionPeriod october;
    CollectionPeriod q4;
    FeeType env;
    FeeType extra;
    Area kv07;
    Area kv24;
    Company dv01;
    String officer;

    @BeforeEach
    void seed() {
        District dth = districts.save(District.create("DTH", "Đông Thạnh"));
        kv07 = areas.save(Area.create("KV07", "Tổ 07", dth));
        kv24 = areas.save(Area.create("KV24", "Tổ 24", dth));
        Area kv09 = areas.save(Area.create("KV09", "Tổ 09", dth));
        dv01 = companies.save(Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1)));
        Company dv03 = companies.save(Company.create("DV03", "Công ty Ba", "B", "0900000003", LocalDate.of(2026, 1, 1)));
        assignments.save(AreaAssignment.create(kv07, dv01, LocalDate.of(2026, 9, 1), null, null));
        AreaAssignment old = AreaAssignment.create(kv09, dv03, LocalDate.of(2026, 1, 1), null, null);
        old.closeOn(LocalDate.of(2026, 9, 30));
        assignments.save(old);
        assignments.save(AreaAssignment.create(kv09, dv01, LocalDate.of(2026, 10, 1), null, null));

        TariffVersion bg = TariffVersion.create("BG-IT", "QĐ thử", LocalDate.of(2026, 9, 1), null, TariffStatus.ACTIVE);
        bg.addRate(TariffGroup.HH_UP_TO_2, 29_000, 11_000, "đ/hộ/tháng");
        bg.addRate(TariffGroup.HH_3_PLUS, 57_000, 23_000, "đ/hộ/tháng");
        tariffs.save(bg);
        october = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg));
        q4 = periods.save(CollectionPeriod.open(PeriodType.QUARTER, 2026, 4, null, LocalDate.of(2026, 12, 31), bg));
        env = feeTypes.save(FeeType.create("ENV", "Phí VSMT", PricingMode.TARIFF, null));
        extra = feeTypes.save(FeeType.create("EXTRA", "Phụ phí", PricingMode.FIXED, 50_000L));

        subject("DTH-H000128", kv07, SubjectStatus.ACTIVE, TariffGroup.HH_3_PLUS, false);   // 80.000
        subject("DTH-H000129", kv07, SubjectStatus.ACTIVE, TariffGroup.HH_UP_TO_2, false);  // 40.000
        subject("DTH-H000130", kv07, SubjectStatus.ACTIVE, TariffGroup.HH_3_PLUS, true);    // miễn → 0
        subject("DTH-H000131", kv07, SubjectStatus.PENDING, null, false);                   // bỏ qua: không active
        subject("DTH-H000132", kv24, SubjectStatus.ACTIVE, TariffGroup.HH_3_PLUS, false);   // bỏ qua: chưa có công ty
        subject("DTH-H000133", kv09, SubjectStatus.ACTIVE, TariffGroup.HH_3_PLUS, false);   // 80.000, công ty DV01 tại 01/10
        officer = token("canbo_it", Role.COMMUNE_OFFICER, null);
    }

    @Test
    void previewAndPublishWholeCommuneGiveTheSameCountAndTotal() throws Exception {
        String body = request(october, env, "ALL", "", "2026-10-25");

        preview(officer, body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chargeCount").value(4))
                .andExpect(jsonPath("$.exemptCount").value(1))
                .andExpect(jsonPath("$.totalAmount").value(200_000))
                .andExpect(jsonPath("$.skipped[*].subjectCode", contains("DTH-H000131", "DTH-H000132")))
                .andExpect(jsonPath("$.skipped[*].reason", contains("SUBJECT_NOT_ACTIVE", "AREA_WITHOUT_COMPANY")))
                .andExpect(jsonPath("$.warningCount").value(1));
        assertThat(count("charges")).isZero();

        publish(officer, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestCode").value("YCT-1026-01"))
                .andExpect(jsonPath("$.chargeCount").value(4))
                .andExpect(jsonPath("$.totalAmount").value(200_000));

        assertThat(jdbc.queryForList("select c.code || '|' || co.code || '|' || c.amount || '|' || c.status from charges c"
                + " join companies co on co.id = c.company_id order by c.code", String.class)).containsExactly(
                "KT-1026-DTH-H000128|DV01|80000|UNPAID", "KT-1026-DTH-H000129|DV01|40000|UNPAID",
                "KT-1026-DTH-H000130|DV01|0|EXEMPT", "KT-1026-DTH-H000133|DV01|80000|UNPAID");
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'ISSUE_CHARGE_REQUEST'"
                + " and entity_id = 'YCT-1026-01'", Integer.class)).isEqualTo(1);
    }

    @Test
    void publishingAgainCreatesNoDuplicates() throws Exception {
        String body = request(october, env, "ALL", "", "2026-10-25");
        publish(officer, body).andExpect(status().isCreated());

        publish(officer, body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chargeCount").value(0))
                .andExpect(jsonPath("$.requestCode").doesNotExist())
                .andExpect(jsonPath("$.skipped[?(@.reason == 'DUPLICATE_CHARGE')]").isNotEmpty());

        assertThat(count("charges")).isEqualTo(4);
        assertThat(count("charge_requests")).isEqualTo(1);
    }

    @Test
    void quarterAfterMonthSkipsSubjectsAlreadyCharged() throws Exception {
        publish(officer, request(october, env, "ALL", "", "2026-10-25")).andExpect(status().isCreated());

        preview(officer, request(q4, env, "ALL", "", "2026-12-20"))
                .andExpect(jsonPath("$.chargeCount").value(0))
                .andExpect(jsonPath("$.skipped[?(@.reason == 'DUPLICATE_CHARGE')].subjectCode",
                        contains("DTH-H000128", "DTH-H000129", "DTH-H000130", "DTH-H000133")));
    }

    @Test
    void extraFeeUsesEnteredPriceAndItsOwnCodeSuffix() throws Exception {
        publish(officer, request(october, extra, "AREAS", "\"areaIds\":[%d],\"unitPrice\":150000,".formatted(kv07.getId()),
                "2026-10-25"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.chargeCount").value(3))
                .andExpect(jsonPath("$.totalAmount").value(300_000));

        assertThat(jdbc.queryForList("select code from charges order by code", String.class))
                .containsExactly("KT-1026-DTH-H000128-EX", "KT-1026-DTH-H000129-EX", "KT-1026-DTH-H000130-EX");
    }

    @Test
    void companyScopeUsesAssignmentsOnTheIssueDate() throws Exception {
        preview(officer, request(october, env, "COMPANY", "\"companyId\":%d,".formatted(dv01.getId()), "2026-10-25"))
                .andExpect(jsonPath("$.chargeCount").value(4));
    }

    @Test
    void lockedPeriodIs422AndOnlyCommuneOfficerMayIssue() throws Exception {
        String body = request(october, env, "ALL", "", "2026-10-25");
        preview(token("admin_it", Role.ADMIN, null), body).andExpect(status().isForbidden());
        publish(token("dv01_it", Role.COMPANY_MANAGER, dv01.getId()), body).andExpect(status().isForbidden());

        jdbc.update("update collection_periods set status = 'LOCKED', locked_at = now() where id = ?", october.getId());
        em.clear(); // khóa kỳ bằng SQL: bỏ bản trong bộ nhớ để service đọc lại từ CSDL (khóa kỳ thật làm ở T32)
        publish(officer, body)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
    }

    @Test
    void householdDueDateMustNotBeAfterPeriodDueDate() throws Exception {
        preview(officer, request(october, env, "ALL", "", "2026-11-05"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CHARGE_DUE_AFTER_PERIOD"));
        preview(officer, request(october, env, "AREAS", "\"areaIds\":[],", "2026-10-25"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CHARGE_SCOPE_INVALID"));
    }

    @Test
    void chargeListIsFilteredAndScopedToTheCompany() throws Exception {
        publish(officer, request(october, env, "ALL", "", "2026-10-25")).andExpect(status().isCreated());

        mvc.perform(get("/api/billing/charges").param("periodId", october.getId().toString()).param("status", "UNPAID")
                        .header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items[0].subjectCode").value("DTH-H000128"))
                .andExpect(jsonPath("$.items[0].companyCode").value("DV01"))
                .andExpect(jsonPath("$.items[0].overdue").value(false));
        mvc.perform(get("/api/billing/charges").header(HttpHeaders.AUTHORIZATION,
                        token("dv03_it", Role.COMPANY_MANAGER, companies.findByCode("DV03").orElseThrow().getId())))
                .andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/billing/charge-requests").param("periodId", october.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$[0].code").value("YCT-1026-01"))
                .andExpect(jsonPath("$[0].chargeCount").value(4))
                .andExpect(jsonPath("$[0].totalAmount").value(200_000));
    }

    private void subject(String code, Area area, SubjectStatus status, TariffGroup group, boolean exempt) {
        ServiceSubject s = ServiceSubject.create(code, SubjectType.HOUSEHOLD, "Hộ " + code, "Số 1", area);
        s.setStatus(status);
        subjects.save(s);
        if (group != null) {
            contracts.save(ServiceContract.create("ĐK-" + code, s, group, LocalDate.of(2026, 1, 1), null, exempt,
                    exempt ? "Hộ nghèo" : null, null));
        }
    }

    private String request(CollectionPeriod period, FeeType fee, String scope, String extraFields, String due) {
        return "{\"periodId\":%d,\"feeTypeId\":%d,\"scopeType\":\"%s\",%s\"dueDate\":\"%s\"}"
                .formatted(period.getId(), fee.getId(), scope, extraFields, due);
    }

    private ResultActions preview(String token, String body) throws Exception {
        return mvc.perform(post("/api/billing/charge-requests/preview").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions publish(String token, String body) throws Exception {
        return mvc.perform(post("/api/billing/charge-requests").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private int count(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }

    private String token(String username, Role role, Long companyId) {
        User user = users.findByUsername(username)
                .orElseGet(() -> users.save(User.create(username, username, role, companyId, "x")));
        return "Bearer " + jwt.issue(user).value();
    }
}
