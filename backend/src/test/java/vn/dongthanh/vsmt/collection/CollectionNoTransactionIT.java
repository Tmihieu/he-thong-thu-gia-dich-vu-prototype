package vn.dongthanh.vsmt.collection;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;



import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * Gọi API người đi thu như server thật: dữ liệu đã commit, không có transaction của test bao ngoài.
 * {@code CollectorWorkIT} chạy trong {@code @Transactional} nên session Hibernate mở suốt request và che lỗi
 * đọc proxy lười khi controller dựng DTO (server thật {@code open-in-view: false} trả 500).
 */
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class CollectionNoTransactionIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired TransactionTemplate tx;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void seed() {
        cleaner.truncateAll();
        tx.executeWithoutResult(s -> fx.build());
    }

    @AfterEach
    void clean() {
        cleaner.truncateAll();
    }

    @Test
    void collectorWorkEndpointsBuildDtosOutsideTestTransaction() throws Exception {
        long charge = fx.chargeId("DTH-H000001");
        mvc.perform(post("/api/collection/payments").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.thu07))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chargeId\":%d,\"amount\":80000,\"method\":\"CASH\",\"clientRequestId\":\"nt-1\"}"
                                .formatted(charge)))
                .andExpect(status().isCreated());
        String manager = fx.bearer(fx.dv01Manager);

        mvc.perform(get("/api/collection/company-work").param("collectorId", fx.thu07.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, manager))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].charge.subjectCode").value("DTH-H000001"))
                .andExpect(jsonPath("$[0].paidAmount").value(80_000));
        mvc.perform(get("/api/collection/collectors/{id}/payments", fx.thu07.getId())
                        .header(HttpHeaders.AUTHORIZATION, manager))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].subjectCode").value("DTH-H000001"))
                .andExpect(jsonPath("$[0].periodCode").value("2026-10"))
                .andExpect(jsonPath("$[0].amount").value(80_000));
        mvc.perform(get("/api/collection/my-charges").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.thu09)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(4));
    }
}
