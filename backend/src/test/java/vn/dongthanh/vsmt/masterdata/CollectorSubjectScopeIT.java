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

/** BR-GEN-04: người đi thu chỉ đọc hồ sơ hộ trong tổ được giao, không phải mọi hộ của công ty. */
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
    void collectorReadsOnlySubjectsInAssignedAreas() throws Exception {
        String thu = fx.bearer(fx.thu07);
        mvc.perform(get("/api/masterdata/subjects/{id}", subjectId).header(HttpHeaders.AUTHORIZATION, thu))
                .andExpect(status().isOk());
        mvc.perform(get("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, thu))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(org.hamcrest.Matchers.greaterThan(0)));

        // Hết phân tổ thì cùng công ty nhưng không còn đọc được hộ đó.
        jdbc.update("update collector_assignments set valid_to = '2026-09-30' where collector_id = ?", fx.thu07.getId());
        mvc.perform(get("/api/masterdata/subjects/{id}", subjectId).header(HttpHeaders.AUTHORIZATION, thu))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/masterdata/subjects/{id}/member-history", subjectId).header(HttpHeaders.AUTHORIZATION, thu))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/masterdata/subjects").header(HttpHeaders.AUTHORIZATION, thu))
                .andExpect(jsonPath("$.total").value(0));
    }
}
