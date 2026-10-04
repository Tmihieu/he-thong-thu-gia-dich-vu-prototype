package vn.dongthanh.vsmt.citizen;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * Hộ chỉ đóng qua mã VietQR: ngân hàng báo tiền vào thì collection ghi thanh toán, app chỉ xem xác nhận.
 * Hộ A = DTH-H000001 (KV07, DV01, 80.000 đ kỳ 10/2026); hộ B = DTH-H000005 (KV12, DV07).
 */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CitizenPaymentIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired CollectionService collection;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;

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
    void vietQrTransferIsRecordedFromTheBankAndCompanyAndLedgerSeeItCollected() throws Exception {
        collection.recordBankTransfer(chargeA, 80_000, "FT26100001", "sepay-1");

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
                "select method, collector_id, citizen_account_id from payments where charge_id = ?", chargeA);
        assertThat(row.get("method")).isEqualTo("TRANSFER");
        assertThat(row.get("collector_id")).isNull();
        assertThat(row.get("citizen_account_id")).isNull();
        assertThat(jdbc.queryForObject("select count(*) from notifications where recipient_type = 'CITIZEN'"
                + " and recipient_citizen_id = ? and kind = 'RECEIPT'", Integer.class, citizenA.getId())).isEqualTo(1);
    }

    @Test
    void citizenCannotRecordAPaymentFromTheApp() throws Exception {
        mvc.perform(post("/api/citizen/payments").header(HttpHeaders.AUTHORIZATION, bearer(citizenA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chargeId\":%d,\"amount\":80000,\"clientRequestId\":\"app-1\"}".formatted(chargeA)))
                .andExpect(status().isMethodNotAllowed());
        assertThat(jdbc.queryForObject("select count(*) from payments", Integer.class)).isZero();
    }

    @Test
    void confirmationsAreListedAndReadableOnlyByOwnHousehold() throws Exception {
        long paymentId = collection.recordBankTransfer(chargeA, 80_000, "FT26100002", "sepay-2").getId();

        mvc.perform(get("/api/citizen/payments").header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(paymentId));
        mvc.perform(get("/api/citizen/payments/{id}/confirmation", paymentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("TT-1026-000001"))
                .andExpect(jsonPath("$.method").value("TRANSFER"))
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
    void collectorCannotMarkATransferByHand() {
        assertThatThrownBy(() -> collection.recordPayment(
                new PaymentCommand(chargeA, 80_000, PaymentMethod.TRANSFER, "x-1", null, null, null),
                fx.actor(fx.thu07)))
                .extracting("code").isEqualTo("PAYMENT_METHOD_INVALID");
        assertThat(jdbc.queryForObject("select count(*) from payments", Integer.class)).isZero();
    }

    private Long subjectIdOf(CitizenAccount a) {
        return a.getSubject().getId();
    }

    private String bearer(CitizenAccount a) {
        return "Bearer " + jwt.issueCitizen(a.getId(), a.getSubject().getId()).value();
    }
}
