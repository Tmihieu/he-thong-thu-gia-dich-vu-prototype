package vn.dongthanh.vsmt.citizen;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Hộ A = DTH-H000001 (KV07, DV01, 80.000 đ kỳ 10/2026); hộ B = DTH-H000005 (KV12, DV07). */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CitizenPaymentIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired CollectionPeriodRepository periods;
    @Autowired CollectionService collection;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    CitizenAccount citizenA;
    CitizenAccount citizenB;
    long chargeA;

    @BeforeEach
    void setUp() {
        fx.build();
        citizenA = accounts.save(CitizenAccount.create("0902000001",
                subjects.findByCode("DTH-H000001").orElseThrow(), "Chủ hộ A"));
        citizenB = accounts.save(CitizenAccount.create("0902000005",
                subjects.findByCode("DTH-H000005").orElseThrow(), "Chủ hộ B"));
        chargeA = fx.chargeId("DTH-H000001");
    }

    @Test
    void citizenPaysChargeAndCompanyAndLedgerSeeItCollected() throws Exception {
        mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(false))
                .andExpect(jsonPath("$.confirmation.code").value("TT-1026-000001"))
                .andExpect(jsonPath("$.confirmation.amount").value(80_000))
                .andExpect(jsonPath("$.confirmation.method").value("APP_SIMULATED"))
                .andExpect(jsonPath("$.confirmation.chargeStatus").value("PAID"));

        mvc.perform(get("/api/billing/charges").param("subjectId", String.valueOf(subjectIdOf(citizenA)))
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].status").value("PAID"));
        mvc.perform(get("/api/remittance/ledger").param("periodId", String.valueOf(fx.october.getId()))
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].companyCode").value("DV01"))
                .andExpect(jsonPath("$[0].collected").value(80_000));

        Map<String, Object> row = jdbc.queryForMap(
                "select method, collector_id, confirmed_by, citizen_account_id from payments where charge_id = ?", chargeA);
        assertThat(row.get("method")).isEqualTo("APP_SIMULATED");
        assertThat(row.get("collector_id")).isNull();
        assertThat(row.get("confirmed_by")).isNull();
        assertThat(row.get("citizen_account_id")).isEqualTo(citizenA.getId());
    }

    @Test
    void paymentWritesAuditAsCitizenAndNotifiesTheCitizen() throws Exception {
        mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-2")).andExpect(status().isOk());

        Map<String, Object> audit = jdbc.queryForMap("select actor_user_id, actor_username, actor_role, action"
                + " from audit_logs where action = 'RECORD_CITIZEN_PAYMENT'");
        assertThat(audit.get("actor_user_id")).isNull();
        assertThat(audit.get("actor_username")).isEqualTo("citizen:0902000001");
        assertThat(audit.get("actor_role")).isEqualTo("CITIZEN");
        assertThat(jdbc.queryForObject("select count(*) from notifications where recipient_type = 'CITIZEN'"
                + " and recipient_citizen_id = ? and kind = 'TRANSACTION'", Integer.class, citizenA.getId())).isEqualTo(1);
    }

    @Test
    void sameRequestIdTwiceCreatesOnePayment() throws Exception {
        mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-dup")).andExpect(status().isOk());
        mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-dup"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(true))
                .andExpect(jsonPath("$.confirmation.code").value("TT-1026-000001"));

        assertThat(jdbc.queryForObject("select count(*) from payments where charge_id = ?", Integer.class, chargeA))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from notifications where recipient_citizen_id = ?",
                Integer.class, citizenA.getId())).isEqualTo(1);
    }

    @Test
    void requestIdOfAnotherHouseholdIsNotReplayedToThem() throws Exception {
        mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-shared")).andExpect(status().isOk());

        mvc.perform(pay(citizenB, fx.chargeId("DTH-H000005"), 80_000, "app-req-shared"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REQUEST_ID_REUSED"));
    }

    @Test
    void payingAnotherHouseholdsChargeReturns404() throws Exception {
        mvc.perform(pay(citizenB, chargeA, 80_000, "app-req-3"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CHARGE_NOT_FOUND"));
        assertThat(jdbc.queryForObject("select count(*) from payments", Integer.class)).isZero();
    }

    @Test
    void lockedPeriodReturns422() throws Exception {
        var october = periods.findById(fx.october.getId()).orElseThrow();
        october.startCollecting();
        october.lock(OffsetDateTime.now(), fx.officer.getId());
        periods.flush();

        mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-4"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PERIOD_LOCKED"));
    }

    @Test
    void amountMustEqualTheCurrentRemainingAmount() throws Exception {
        collection.recordPayment(new PaymentCommand(chargeA, 30_000, PaymentMethod.CASH, "cash-1", null, null, null),
                fx.actor(fx.thu07));

        mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-5"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYMENT_AMOUNT_CHANGED"))
                .andExpect(jsonPath("$.message").value(containsStringIgnoringCase("50.000")));
        mvc.perform(pay(citizenA, chargeA, 50_000, "app-req-6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmation.chargeStatus").value("PAID"));
    }

    @Test
    void paidChargeCannotBePaidAgain() throws Exception {
        mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-7")).andExpect(status().isOk());

        mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-8"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CHARGE_ALREADY_PAID"));
    }

    @Test
    void confirmationsAreListedAndReadableOnlyByOwnHousehold() throws Exception {
        String body = mvc.perform(pay(citizenA, chargeA, 80_000, "app-req-9")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long paymentId = json.readTree(body).at("/confirmation/id").asLong();

        mvc.perform(get("/api/citizen/payments").header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(paymentId));
        mvc.perform(get("/api/citizen/payments/{id}/confirmation", paymentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("TT-1026-000001"))
                .andExpect(jsonPath("$.subjectCode").value("DTH-H000001"))
                .andExpect(jsonPath("$.companyName").value("Công ty Một"))
                .andExpect(jsonPath("$.periodLabel").isNotEmpty())
                .andExpect(content().string(not(containsStringIgnoringCase("biên lai"))));

        mvc.perform(get("/api/citizen/payments").header(HttpHeaders.AUTHORIZATION, bearer(citizenB)))
                .andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/citizen/payments/{id}/confirmation", paymentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(citizenB)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PAYMENT_NOT_FOUND"));
    }

    @Test
    void collectorStillCannotRecordAppPayments() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> collection.recordPayment(
                new PaymentCommand(chargeA, 80_000, PaymentMethod.APP_SIMULATED, "x-1", null, null, null),
                fx.actor(fx.thu07)))
                .hasMessageContaining("app người dân");
    }

    private RequestBuilder pay(CitizenAccount citizen, long chargeId, long amount, String requestId) {
        return post("/api/citizen/payments").header(HttpHeaders.AUTHORIZATION, bearer(citizen))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"chargeId\":%d,\"amount\":%d,\"clientRequestId\":\"%s\"}".formatted(chargeId, amount,
                        requestId));
    }

    private Long subjectIdOf(CitizenAccount a) {
        return a.getSubject().getId();
    }

    private String bearer(CitizenAccount a) {
        return "Bearer " + jwt.issueCitizen(a.getId(), a.getSubject().getId()).value();
    }
}
