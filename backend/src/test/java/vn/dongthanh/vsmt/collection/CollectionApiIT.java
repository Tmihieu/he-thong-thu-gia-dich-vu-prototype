package vn.dongthanh.vsmt.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

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

import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CollectionApiIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;

    String collector;

    @BeforeEach
    void seed() {
        fx.build();
        collector = fx.bearer(fx.thu07);
    }

    @Test
    void collectorRecordsCashPaymentAndChargeBecomesPaidWithAudit() throws Exception {
        long charge = fx.chargeId("DTH-H000001");

        pay(collector, charge, 80_000, "req-1")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.payment.code").value("TT-1026-000001"))
                .andExpect(jsonPath("$.chargeStatus").value("PAID"))
                .andExpect(jsonPath("$.remainingAmount").value(0))
                .andExpect(jsonPath("$.replayed").value(false));

        Map<String, Object> audit = jdbc.queryForMap("select before_data ->> 'status' as b, after_data ->> 'status' as a"
                + " from audit_logs where action = 'RECORD_PAYMENT'");
        assertThat(audit).containsEntry("b", "UNPAID").containsEntry("a", "PAID");
    }

    @Test
    void sendingTheSameRequestTwiceCreatesOnePayment() throws Exception {
        long charge = fx.chargeId("DTH-H000001");
        pay(collector, charge, 80_000, "req-1").andExpect(status().isCreated());

        pay(collector, charge, 80_000, "req-1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(true))
                .andExpect(jsonPath("$.payment.code").value("TT-1026-000001"));

        assertThat(jdbc.queryForObject("select count(*) from payments", Integer.class)).isEqualTo(1);
    }

    @Test
    void chargeOutsideAssignedAreaIs404AndOtherCompanyManagerToo() throws Exception {
        pay(collector, fx.chargeId("DTH-H000003"), 80_000, "req-1")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CHARGE_NOT_FOUND"));
        pay(fx.bearer(fx.dv07Manager), fx.chargeId("DTH-H000001"), 80_000, "req-2")
                .andExpect(status().isNotFound());
        pay(fx.bearer(fx.officer), fx.chargeId("DTH-H000001"), 80_000, "req-3")
                .andExpect(status().isForbidden());
    }

    @Test
    void partialPaymentThenOverpaymentIsRejected() throws Exception {
        long charge = fx.chargeId("DTH-H000002");
        pay(collector, charge, 30_000, "req-1").andExpect(jsonPath("$.chargeStatus").value("UNPAID"))
                .andExpect(jsonPath("$.remainingAmount").value(50_000));
        pay(collector, charge, 60_000, "req-2")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYMENT_AMOUNT_INVALID"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("50.000")));
    }

    @Test
    void visitsShowUpInCollectorWorkListWithoutChangingStatus() throws Exception {
        long absent = fx.chargeId("DTH-H000002");
        mvc.perform(post("/api/collection/visits").header(HttpHeaders.AUTHORIZATION, collector)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chargeId\":%d,\"result\":\"ABSENT\",\"note\":\"Nhà khóa cửa\",\"clientRequestId\":\"v-1\"}"
                                .formatted(absent)))
                .andExpect(status().isCreated());
        pay(collector, fx.chargeId("DTH-H000001"), 80_000, "req-1");

        mvc.perform(get("/api/collection/my-work").header(HttpHeaders.AUTHORIZATION, collector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].charge.subjectCode", contains("DTH-H000001", "DTH-H000002")))
                .andExpect(jsonPath("$[0].charge.status").value("PAID"))
                .andExpect(jsonPath("$[0].paidAmount").value(80_000))
                .andExpect(jsonPath("$[1].charge.status").value("UNPAID"))
                .andExpect(jsonPath("$[1].remainingAmount").value(80_000))
                .andExpect(jsonPath("$[1].lastVisit.result").value("ABSENT"));

        // Quản lý công ty thấy mọi khoản của công ty (KV07 + KV09), lọc được theo tổ; công ty khác không thấy.
        mvc.perform(get("/api/collection/company-work").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].paidAmount").value(80_000));
        mvc.perform(get("/api/collection/company-work").param("areaId", fx.kv09.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$[*].charge.areaCode", contains("KV09", "KV09")));
        mvc.perform(get("/api/collection/company-work").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv07Manager)))
                .andExpect(jsonPath("$[*].charge.companyCode", contains("DV07", "DV07")));
        mvc.perform(get("/api/collection/company-work").header(HttpHeaders.AUTHORIZATION, collector))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/collection/charges/" + absent + "/activity").header(HttpHeaders.AUTHORIZATION,
                        fx.bearer(fx.officer)))
                .andExpect(jsonPath("$.visits[0].note").value("Nhà khóa cửa"))
                .andExpect(jsonPath("$.payments").isEmpty());
    }

    @Test
    void managerRecordsOnBehalfOfOwnCollector() throws Exception {
        String manager = fx.bearer(fx.dv01Manager);
        long charge = fx.chargeId("DTH-H000003");
        pay(manager, charge, 80_000, "req-1")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYMENT_COLLECTOR_REQUIRED"));

        mvc.perform(post("/api/collection/payments").header(HttpHeaders.AUTHORIZATION, manager)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chargeId\":%d,\"amount\":80000,\"method\":\"TRANSFER\",\"clientRequestId\":\"req-2\",\"collectorId\":%d}"
                                .formatted(charge, fx.thu09.getId())))
                .andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select collector_id from payments", Long.class)).isEqualTo(fx.thu09.getId());
        assertThat(jdbc.queryForObject("select confirmed_by from payments", Long.class)).isEqualTo(fx.dv01Manager.getId());
    }

    private ResultActions pay(String token, long chargeId, long amount, String requestId) throws Exception {
        return mvc.perform(post("/api/collection/payments").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"chargeId\":%d,\"amount\":%d,\"method\":\"CASH\",\"clientRequestId\":\"%s\"}"
                        .formatted(chargeId, amount, requestId)));
    }
}
