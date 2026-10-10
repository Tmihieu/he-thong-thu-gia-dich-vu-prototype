package vn.dongthanh.vsmt.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Nhật ký sau kịch bản: phát hành phí (fixture) → người thu ghi thu → xã lập phiếu thu công ty. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class AuditLogApiIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired CollectionService collection;
    @Autowired JdbcTemplate jdbc;

    String admin;

    @BeforeEach
    void seed() throws Exception {
        // IT khác (vd. AuditServiceIT) commit dòng nhật ký thật; dọn trong transaction của test, rollback trả lại sau.
        cleaner.truncateAll();
        fx.build();
        collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000001"), 80_000, PaymentMethod.CASH, "p-1",
                null, null, null), fx.actor(fx.thu07));
        mvc.perform(post("/api/remittance/receipts").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":%d,\"periodId\":%d,\"amount\":80000,\"method\":\"TRANSFER\"}"
                                .formatted(fx.dv01.getId(), fx.october.getId())))
                .andExpect(status().isCreated());
        admin = fx.bearer(fx.admin);
    }

    @Test
    void adminSeesNewestFirstWithBeforeAndAfter() throws Exception {
        JsonNode page = body(list(admin, "")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items[*].action",
                        contains("ISSUE_COMPANY_RECEIPT", "RECORD_PAYMENT", "ISSUE_CHARGE_REQUEST"))));

        JsonNode receipt = page.at("/items/0");
        assertThat(receipt.get("actorUsername").asText()).isEqualTo("canbo_fx");
        assertThat(receipt.get("actorRole").asText()).isEqualTo("COMMUNE_OFFICER");
        assertThat(receipt.get("entityType").asText()).isEqualTo("CompanyReceipt");
        assertThat(receipt.get("entityId").asText()).isEqualTo("PT-CT-1026-001");
        assertThat(receipt.get("ipAddress").textValue()).isEqualTo("127.0.0.1");
        assertThat(receipt.get("beforeData").isNull()).isTrue();
        JsonNode after = json.readTree(receipt.get("afterData").asText());
        assertThat(after.get("company").asText()).isEqualTo("DV01");
        assertThat(after.get("amount").asLong()).isEqualTo(80_000);

        JsonNode payment = page.at("/items/1");
        assertThat(json.readTree(payment.get("beforeData").asText()).get("status").asText()).isEqualTo("UNPAID");
        assertThat(json.readTree(payment.get("afterData").asText()).get("status").asText()).isEqualTo("PAID");
    }

    @Test
    void nonAdminIsForbidden() throws Exception {
        list(fx.bearer(fx.officer), "").andExpect(status().isForbidden());
        list(fx.bearer(fx.dv01Manager), "").andExpect(status().isForbidden());
        list(fx.bearer(fx.thu07), "").andExpect(status().isForbidden());
    }

    @Test
    void filtersByActionAndActor() throws Exception {
        list(admin, "action=RECORD_PAYMENT")
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[*].action", contains("RECORD_PAYMENT")));
        list(admin, "actorUsername=CANBO")
                .andExpect(jsonPath("$.items[*].action", contains("ISSUE_COMPANY_RECEIPT", "ISSUE_CHARGE_REQUEST")));
        // "_" được so như ký tự thường, không phải ký tự đại diện: "thu_7" không khớp thu07_fx.
        list(admin, "actorUsername=thu_7").andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void dayFilterUsesVietnamTimeAndIncludesWholeToDay() throws Exception {
        // Mốc cố định ở quá khứ (dòng seed ghi theo giờ thật); 00:00 giờ VN = 17:00 UTC hôm trước.
        jdbc.update("insert into audit_logs (occurred_at, actor_username, actor_role, action, entity_type, entity_id)"
                + " values ('2025-12-31 23:59:00+07', 'admin_fx', 'ADMIN', 'OPEN_PERIOD', 'CollectionPeriod',"
                + " 'CUOI-NGAY'), ('2026-01-01 00:00:00+07', 'admin_fx', 'ADMIN', 'OPEN_PERIOD', 'CollectionPeriod',"
                + " 'DAU-NGAY')");

        list(admin, "from=2025-12-31&to=2025-12-31").andExpect(jsonPath("$.items[*].entityId", contains("CUOI-NGAY")));
        list(admin, "from=2026-01-01&to=2026-01-01").andExpect(jsonPath("$.items[*].entityId", contains("DAU-NGAY")));
    }

    @Test
    void pagesNewestFirst() throws Exception {
        list(admin, "page=1&size=2")
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.items[*].action", contains("ISSUE_CHARGE_REQUEST")));
    }

    private ResultActions list(String token, String query) throws Exception {
        return mvc.perform(get("/api/platform/audit-logs?" + query).header(HttpHeaders.AUTHORIZATION, token));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
