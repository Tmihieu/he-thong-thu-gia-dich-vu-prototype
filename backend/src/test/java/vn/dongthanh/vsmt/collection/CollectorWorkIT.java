package vn.dongthanh.vsmt.collection;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * UC-23, UC-30, UC-33: không còn phân tổ. Người đi thu thu và xem mọi hộ/khoản của công ty mình, không thấy công ty
 * khác; công ty xem lịch sử thu và danh sách hộ do từng người đi thu đã thu (theo payments.collector_id).
 */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CollectorWorkIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;

    @BeforeEach
    void seed() {
        fx.build();
    }

    @Test
    void collectorSeesAndCollectsEveryChargeOfOwnCompanyOnly() throws Exception {
        String thu07 = fx.bearer(fx.thu07);
        mvc.perform(get("/api/collection/my-charges").header(HttpHeaders.AUTHORIZATION, thu07))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].areaCode", contains("KV07", "KV07", "KV09", "KV09")));
        mvc.perform(get("/api/collection/my-charges/" + fx.chargeId("DTH-H000003")).header(HttpHeaders.AUTHORIZATION, thu07))
                .andExpect(status().isOk());
        mvc.perform(get("/api/collection/my-charges/" + fx.chargeId("DTH-H000005")).header(HttpHeaders.AUTHORIZATION, thu07))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/collection/my-work").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.thu12)))
                .andExpect(jsonPath("$[*].charge.companyCode", contains("DV07", "DV07")));
        mvc.perform(get("/api/billing/charges").header(HttpHeaders.AUTHORIZATION, thu07))
                .andExpect(status().isForbidden());
    }

    @Test
    void companySeesWhatEachCollectorCollectedAndOtherCompaniesAreRejected() throws Exception {
        pay(fx.thu07, "DTH-H000001", "p-1").andExpect(status().isCreated());
        pay(fx.thu07, "DTH-H000003", "p-2").andExpect(status().isCreated()); // hộ KV09 nhưng người đi thu là thu07
        pay(fx.thu09, "DTH-H000004", "p-3").andExpect(status().isCreated());
        String manager = fx.bearer(fx.dv01Manager);

        mvc.perform(get("/api/collection/company-work").param("collectorId", fx.thu07.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, manager))
                .andExpect(jsonPath("$[*].charge.subjectCode", contains("DTH-H000001", "DTH-H000003")));
        mvc.perform(get("/api/collection/company-work").param("collectorId", fx.thu09.getId().toString())
                        .param("status", "UNPAID").header(HttpHeaders.AUTHORIZATION, manager))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/collection/collectors/{id}/payments", fx.thu07.getId())
                        .header(HttpHeaders.AUTHORIZATION, manager))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].subjectCode", contains("DTH-H000003", "DTH-H000001")));

        // Công ty khác không xem được người đi thu của DV01; người đi thu không xem được tiến độ của người khác.
        String otherManager = fx.bearer(fx.dv07Manager);
        mvc.perform(get("/api/collection/collectors/{id}/payments", fx.thu07.getId())
                        .header(HttpHeaders.AUTHORIZATION, otherManager))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/collection/company-work").param("collectorId", fx.thu07.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, otherManager))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/collection/collectors/{id}/payments", fx.thu07.getId())
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.thu09)))
                .andExpect(status().isForbidden());
    }

    private ResultActions pay(vn.dongthanh.vsmt.platform.domain.User collector, String subjectCode, String requestId)
            throws Exception {
        return mvc.perform(post("/api/collection/payments").header(HttpHeaders.AUTHORIZATION, fx.bearer(collector))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"chargeId\":%d,\"amount\":80000,\"method\":\"CASH\",\"clientRequestId\":\"%s\"}"
                        .formatted(fx.chargeId(subjectCode), requestId)));
    }
}
