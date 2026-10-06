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
    void chargeOfAnotherCompanyIs404AndOtherCompanyManagerToo() throws Exception {
        pay(collector, fx.chargeId("DTH-H000005"), 80_000, "req-1")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CHARGE_NOT_FOUND"));
        pay(fx.bearer(fx.dv07Manager), fx.chargeId("DTH-H000001"), 80_000, "req-2")
                .andExpect(status().isNotFound());
        pay(fx.bearer(fx.officer), fx.chargeId("DTH-H000001"), 80_000, "req-3")
                .andExpect(status().isForbidden());
    }

    @Test
    void partialOrExcessAmountIsRejected() throws Exception {
        long charge = fx.chargeId("DTH-H000002");
        pay(collector, charge, 30_000, "req-1")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYMENT_AMOUNT_INVALID"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("80.000")));
        pay(collector, charge, 90_000, "req-2")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYMENT_AMOUNT_INVALID"));
        assertThat(jdbc.queryForObject("select count(*) from payments", Integer.class)).isZero();
    }

    @Test
    void collectorWorkListShowsPaidAndUnpaidCharges() throws Exception {
        long unpaid = fx.chargeId("DTH-H000002");
        pay(collector, fx.chargeId("DTH-H000001"), 80_000, "req-1");

        mvc.perform(get("/api/collection/my-work").header(HttpHeaders.AUTHORIZATION, collector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].charge.subjectCode", contains("DTH-H000001", "DTH-H000002", "DTH-H000003", "DTH-H000004")))
                .andExpect(jsonPath("$[0].charge.status").value("PAID"))
                .andExpect(jsonPath("$[0].paidAmount").value(80_000))
                .andExpect(jsonPath("$[0].lastPaidAt").isNotEmpty())
                .andExpect(jsonPath("$[1].charge.status").value("UNPAID"))
                .andExpect(jsonPath("$[1].lastPaidAt").isEmpty())
                .andExpect(jsonPath("$[1].remainingAmount").value(80_000));

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

        mvc.perform(get("/api/collection/charges/" + unpaid + "/activity").header(HttpHeaders.AUTHORIZATION,
                        fx.bearer(fx.officer)))
                .andExpect(jsonPath("$.remainingAmount").value(80_000))
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
                        .content("{\"chargeId\":%d,\"amount\":80000,\"method\":\"CASH\",\"clientRequestId\":\"req-2\",\"collectorId\":%d}"
                                .formatted(charge, fx.thu09.getId())))
                .andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select collector_id from payments", Long.class)).isEqualTo(fx.thu09.getId());
        assertThat(jdbc.queryForObject("select confirmed_by from payments", Long.class)).isEqualTo(fx.dv01Manager.getId());
    }

    @Test
    void transferCannotBeRecordedByHandOnlyByTheBankViaVietQr() throws Exception {
        mvc.perform(post("/api/collection/payments").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.thu07))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chargeId\":%d,\"amount\":80000,\"method\":\"TRANSFER\",\"clientRequestId\":\"req-t\"}"
                                .formatted(fx.chargeId("DTH-H000001"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYMENT_METHOD_INVALID"));
        assertThat(jdbc.queryForObject("select count(*) from payments", Integer.class)).isZero();
    }

    private ResultActions pay(String token, long chargeId, long amount, String requestId) throws Exception {
        return mvc.perform(post("/api/collection/payments").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"chargeId\":%d,\"amount\":%d,\"method\":\"CASH\",\"clientRequestId\":\"%s\"}"
                        .formatted(chargeId, amount, requestId)));
    }
}
