package vn.dongthanh.vsmt.platform.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import vn.dongthanh.vsmt.support.IntegrationTest;

/** CORS chỉ mở cho origin được cấu hình (profile demo: localhost); origin lạ không nhận header cho phép. */
@AutoConfigureMockMvc
@TestPropertySource(properties = "vsmt.cors.allowed-origin-patterns=http://localhost:*,http://127.0.0.1:*")
class CorsIT extends IntegrationTest {

    static final String PATH = "/api/citizen/auth/otp/verify";

    @Autowired MockMvc mvc;

    @Test
    void preflightFromLocalhostPassesWithoutToken() throws Exception {
        mvc.perform(options(PATH).header(HttpHeaders.ORIGIN, "http://localhost:8082")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:8082"));
    }

    @Test
    void preflightFromOtherOriginIsRejected() throws Exception {
        mvc.perform(options(PATH).header(HttpHeaders.ORIGIN, "https://evil.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
