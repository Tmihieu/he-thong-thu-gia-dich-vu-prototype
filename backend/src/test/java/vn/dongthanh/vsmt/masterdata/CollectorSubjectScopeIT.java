package vn.dongthanh.vsmt.masterdata;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** BR-GEN-04 / UC-18: người đi thu đọc hồ sơ mọi hộ của công ty mình (không còn phân tổ), không đọc hộ công ty khác. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CollectorSubjectScopeIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired JdbcTemplate jdbc;

    long subjectId;

    @BeforeEach
    void seed() {
        fx.build();
        subjectId = jdbc.queryForObject("select id from service_subjects where code = 'DTH-H000001'", Long.class);
    }

    @Test
    void collectorReadsSubjectsOfOwnCompanyOnly() throws Exception {
        String thu = fx.bearer(fx.thu07);
        mvc.perform(get("/api/masterdata/subjects/{id}", subjectId).header(HttpHeaders.AUTHORIZATION, thu))
                .andExpect(status().isOk());
        // Hộ KV09 cùng công ty DV01: không còn phân tổ nên đọc được.
        long sameCompany = jdbc.queryForObject("select id from service_subjects where code = 'DTH-H000003'", Long.class);
        mvc.perform(get("/api/masterdata/subjects/{id}", sameCompany).header(HttpHeaders.AUTHORIZATION, thu))
                .andExpect(status().isOk());
        mvc.perform(get("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, thu))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(4));

        // Hộ của công ty khác (KV12 của DV07) vẫn là 404.
        long otherCompany = jdbc.queryForObject("select id from service_subjects where code = 'DTH-H000005'", Long.class);
        mvc.perform(get("/api/masterdata/subjects/{id}", otherCompany).header(HttpHeaders.AUTHORIZATION, thu))
                .andExpect(status().isNotFound());
    }
}
