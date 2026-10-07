package vn.dongthanh.vsmt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import vn.dongthanh.vsmt.support.IntegrationTest;

class SmokeIT extends IntegrationTest {

    @Autowired
    Flyway flyway;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    MockMvc mvc;

    @Test
    void flywayRunsOnPostgres16() {
        assertThat(jdbc.queryForObject("select version()", String.class)).startsWith("PostgreSQL 16");
        assertThat(jdbc.queryForObject("select to_regclass('flyway_schema_history') is not null", Boolean.class))
                .isTrue();
        assertThat(flyway.info().pending()).isEmpty();
    }

    @Test
    void openApiIsPublic() throws Exception {
        String doc = mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").exists())
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        // OPENAPI_OUT=<file>: ghi tài liệu ra file để web sinh kiểu (openapi-typescript <file>) khi không chạy backend.
        String out = System.getenv("OPENAPI_OUT");
        if (out != null && !out.isBlank()) {
            java.nio.file.Files.writeString(java.nio.file.Path.of(out), doc);
        }
    }

    @Test
    void protectedApiReturns401AsApiError() throws Exception {
        mvc.perform(get("/api/anything"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").exists());
    }
}
