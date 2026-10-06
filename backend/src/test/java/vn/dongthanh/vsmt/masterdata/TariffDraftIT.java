package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersionRepository;
import vn.dongthanh.vsmt.masterdata.service.TariffService;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Soạn, ban hành và sửa biểu giá; bản đã ban hành giữ nguyên hiệu lực. */
@Transactional
class TariffDraftIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    TariffVersionRepository versions;

    @Autowired
    CollectionPeriodRepository periods;

    @Autowired
    TariffService tariffs;

    @Autowired
    UserRepository users;

    @Autowired
    JwtService jwt;

    @Autowired
    JdbcTemplate jdbc;

    String admin;
    TariffVersion bg65;

    @BeforeEach
    void seed() {
        bg65 = TariffVersion.create("BG-65-2026", "QĐ 65/2026/QĐ-UBND", LocalDate.of(2026, 9, 1), null,
                TariffStatus.ACTIVE);
        for (TariffGroup g : TariffGroup.values()) {
            bg65.addRate(g, 30_000, 10_000, "đ/hộ/tháng");
        }
        versions.save(bg65);
        admin = token("admin_bg", Role.ADMIN);
    }

    @Test
    void adminCreatesEditsAndIssuesDraftOldVersionEndsTheDayBefore() throws Exception {
        String body = create(admin, "BG-70-2027", "2027-01-01", 45_000)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.rates.length()").value(7))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(body, "$.id")).longValue();

        mvc.perform(put("/api/masterdata/tariffs/" + id).header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content(draft("2027-01-01", 50_000)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rates[0].collectionFee").value(50_000))
                .andExpect(jsonPath("$.rates[0].monthlyTotal").value(60_000));

        issue(admin, id).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.issuedDate").isNotEmpty());

        TariffVersion old = versions.findByCode("BG-65-2026").orElseThrow();
        assertThat(old.getValidTo()).isEqualTo(LocalDate.of(2026, 12, 31));
        assertThat(old.getStatus()).isEqualTo(TariffStatus.ACTIVE);
        assertThat(tariffs.activeVersionOn(LocalDate.of(2026, 12, 31)).getCode()).isEqualTo("BG-65-2026");
        assertThat(tariffs.activeVersionOn(LocalDate.of(2027, 1, 1)).getCode()).isEqualTo("BG-70-2027");
        assertThat(jdbc.queryForList("select action from audit_logs where entity_type = 'TariffVersion'"
                + " order by id", String.class))
                .containsExactly("CREATE_TARIFF_DRAFT", "UPDATE_TARIFF_DRAFT", "END_TARIFF_VERSION",
                        "ISSUE_TARIFF_VERSION");

        // QĐ-L7: đã ban hành thì không sửa đơn giá, cũng không ban hành lại.
        mvc.perform(put("/api/masterdata/tariffs/" + id).header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content(draft("2027-01-01", 1)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TARIFF_NOT_DRAFT"));
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'UPDATE_TARIFF_VERSION'",
                Integer.class)).isZero();
        issue(admin, id).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void issuedTariffCannotBeEditedAndOnlyAdminCanEdit() throws Exception {
        mvc.perform(put("/api/masterdata/tariffs/" + bg65.getId()).header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content(draft("2026-10-01", 50_000)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TARIFF_NOT_DRAFT"));
        mvc.perform(put("/api/masterdata/tariffs/" + bg65.getId())
                .header(HttpHeaders.AUTHORIZATION, token("officer_edit", Role.COMMUNE_OFFICER))
                .contentType(MediaType.APPLICATION_JSON).content(draft("2026-09-01", 50_000)))
                .andExpect(status().isForbidden());
        assertThat(bg65.rateFor(TariffGroup.HH_UP_TO_2).orElseThrow().getCollectionFee()).isEqualTo(30_000);
    }

    @Test
    void draftMustHaveAllGroupsAndUniqueCode() throws Exception {
        String threeGroups = """
                {"code":"BG-THIEU","draft":{"legalBasis":"QĐ","validFrom":"2027-01-01","rates":[%s,%s,%s]}}"""
                .formatted(rate("HH_UP_TO_2", 1), rate("HH_3_PLUS", 1), rate("SMALL_UP_TO_126", 1));
        mvc.perform(post("/api/masterdata/tariffs").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content(threeGroups))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TARIFF_RATES_INCOMPLETE"));
        create(admin, "BG-65-2026", "2027-01-01", 1).andExpect(status().isConflict());
    }

    @Test
    void cannotIssueWhenAPeriodAlreadyStartsOnOrAfterTheNewDate() throws Exception {
        periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null, LocalDate.of(2026, 11, 30), bg65));
        long id = createdId("2026-11-01");
        issue(admin, id).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TARIFF_PERIOD_ALREADY_OPEN"));
        assertThat(versions.findByCode("BG-65-2026").orElseThrow().getValidTo()).isNull();
    }

    @Test
    void cannotReplaceTheWholeActiveVersion() throws Exception {
        long id = createdId("2026-09-01");
        issue(admin, id).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TARIFF_REPLACES_WHOLE"));
    }

    @Test
    void onlyAdminWritesTariffs() throws Exception {
        create(token("canbo_bg", Role.COMMUNE_OFFICER), "BG-X", "2027-01-01", 1).andExpect(status().isForbidden());
        create(token("lanhdao_bg", Role.LEADER), "BG-Y", "2027-01-01", 1).andExpect(status().isForbidden());
    }

    private long createdId(String validFrom) throws Exception {
        String body = create(admin, "BG-MOI", validFrom, 45_000).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private ResultActions create(String token, String code, String validFrom, long fee) throws Exception {
        return mvc.perform(post("/api/masterdata/tariffs").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"%s\",\"draft\":%s}".formatted(code, draft(validFrom, fee))));
    }

    private ResultActions issue(String token, long id) throws Exception {
        return mvc.perform(post("/api/masterdata/tariffs/" + id + "/issue").header(HttpHeaders.AUTHORIZATION, token));
    }

    private static String draft(String validFrom, long fee) {
        return """
                {"legalBasis":"QĐ 70/2026/QĐ-UBND","validFrom":"%s","rates":[%s,%s,%s,%s,%s,%s,%s]}"""
                .formatted(validFrom, rate("HH_UP_TO_2", fee), rate("HH_3_PLUS", fee), rate("SMALL_UP_TO_126", fee),
                        rate("SMALL_126_TO_250", fee), rate("SMALL_250_TO_500", fee),
                        rate("BY_VOLUME", fee), rate("FULL_COST_BY_KG", fee));
    }

    private static String rate(String group, long fee) {
        return """
                {"tariffGroup":"%s","collectionFee":%d,"transportFee":10000,"unitLabel":"đ/hộ/tháng"}"""
                .formatted(group, fee);
    }

    private String token(String username, Role role) {
        User user = users.save(User.create(username, username, role, null, "x"));
        return "Bearer " + jwt.issue(user).value();
    }
}
