package vn.dongthanh.vsmt.collection;

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

import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CashApiIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired CollectionService collection;

    @BeforeEach
    void seed() {
        fx.build();
        // thu07 thu tiền mặt 2 hộ KV07; thu09 chuyển khoản 1 hộ KV09 (không tính vào tiền mặt đang giữ).
        pay("DTH-H000001", PaymentMethod.CASH, fx.thu07, "p-1");
        pay("DTH-H000002", PaymentMethod.CASH, fx.thu07, "p-2");
        pay("DTH-H000003", PaymentMethod.TRANSFER, fx.thu09, "p-3");
    }

    @Test
    void managerReceivesCashAndHeldAmountDrops() throws Exception {
        String manager = fx.bearer(fx.dv01Manager);
        held(manager, null)
                .andExpect(jsonPath("$[*].collectorUsername", contains("thu07_fx", "thu09_fx")))
                .andExpect(jsonPath("$[0].held").value(160_000))
                .andExpect(jsonPath("$[1].held").value(0));

        handover(manager, fx.thu07, 100_000)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("BG-1026-01"))
                .andExpect(jsonPath("$.handoverDate").value("2026-10-01"));

        held(fx.bearer(fx.thu07), null)
                .andExpect(jsonPath("$[0].collectedCash").value(160_000))
                .andExpect(jsonPath("$[0].handedOver").value(100_000))
                .andExpect(jsonPath("$[0].held").value(60_000));
        mvc.perform(get("/api/collection/cash/handovers").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.thu07)))
                .andExpect(jsonPath("$[0].amount").value(100_000));
        assertThat(jdbc.queryForObject("select received_by from cash_handovers", Long.class))
                .isEqualTo(fx.dv01Manager.getId());
    }

    @Test
    void handoverAboveHeldIs422() throws Exception {
        handover(fx.bearer(fx.dv01Manager), fx.thu07, 160_001)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("HANDOVER_AMOUNT_INVALID"));
    }

    @Test
    void companyCannotReceiveFromAnotherCompanyCollectorAndCollectorCannotRecord() throws Exception {
        handover(fx.bearer(fx.dv07Manager), fx.thu07, 10_000).andExpect(status().isForbidden());
        handover(fx.bearer(fx.thu07), fx.thu07, 10_000).andExpect(status().isForbidden());
        held(fx.bearer(fx.dv07Manager), fx.thu07.getId()).andExpect(status().isForbidden());
    }

    private void pay(String subject, PaymentMethod method, User collector, String requestId) {
        collection.recordPayment(new PaymentCommand(fx.chargeId(subject), 80_000, method, requestId, null, null, null),
                fx.actor(collector));
    }

    private ResultActions held(String token, Long collectorId) throws Exception {
        var req = get("/api/collection/cash/held").header(HttpHeaders.AUTHORIZATION, token);
        if (collectorId != null) {
            req = req.param("collectorId", collectorId.toString());
        }
        return mvc.perform(req);
    }

    private ResultActions handover(String token, User collector, long amount) throws Exception {
        return mvc.perform(post("/api/collection/cash/handovers").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"collectorId\":%d,\"amount\":%d}".formatted(collector.getId(), amount)));
    }
}
