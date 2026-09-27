package vn.dongthanh.vsmt.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

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
 * Gọi API phân tổ như server thật: dữ liệu đã commit, không có transaction của test bao ngoài.
 * {@code CollectorAssignmentIT} chạy trong {@code @Transactional} nên session Hibernate mở suốt request và che lỗi
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
    void companyEndsCollectorAssignmentOutsideTestTransaction() throws Exception {
        long id = jdbc.queryForObject("select id from collector_assignments where collector_id = ?", Long.class,
                fx.thu07.getId());

        mvc.perform(post("/api/collection/collector-assignments/{id}/end", id)
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"endDate\":\"2026-10-31\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.collectorId").value(fx.thu07.getId()))
                .andExpect(jsonPath("$.collectorUsername").value("thu07_fx"))
                .andExpect(jsonPath("$.collectorName").value("Người thu 07"))
                .andExpect(jsonPath("$.areaCode").value("KV07"))
                .andExpect(jsonPath("$.areaName").value("Tổ 07"))
                .andExpect(jsonPath("$.companyId").value(fx.dv01.getId()))
                .andExpect(jsonPath("$.validFrom").value("2026-09-01"))
                .andExpect(jsonPath("$.validTo").value("2026-10-31"));

        assertThat(jdbc.queryForObject("select valid_to from collector_assignments where id = ?", LocalDate.class, id))
                .isEqualTo(LocalDate.of(2026, 10, 31));
    }
}
