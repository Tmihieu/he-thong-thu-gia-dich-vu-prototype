package vn.dongthanh.vsmt.citizen;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CitizenAuthIT extends IntegrationTest {

    static final String PHONE = "0902000001";

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @Value("${vsmt.citizen.demo-otp}")
    String demoOtp;

    ServiceSubject household;

    @BeforeEach
    void setUp() {
        fx.build();
        household = subjects.findByCode("DTH-H000001").orElseThrow();
        accounts.save(CitizenAccount.create(PHONE, household, "Nguyễn Văn Mẫu"));
    }

    @Test
    void requestOtpIsSimulatedAndDoesNotRevealWhetherPhoneExists() throws Exception {
        for (String phone : new String[] {PHONE, "0999999999"}) {
            mvc.perform(post("/api/citizen/auth/otp/request").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"phone\":\"" + phone + "\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.simulated").value(true))
                    .andExpect(jsonPath("$.message").isNotEmpty())
                    .andExpect(jsonPath("$.otp").doesNotExist());
        }
    }

    @Test
    void requestOtpRejectsMalformedPhone() throws Exception {
        mvc.perform(post("/api/citizen/auth/otp/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"abc\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void verifyWithFixedOtpReturnsCitizenTokenUsableOnCitizenApi() throws Exception {
        String token = login(PHONE, demoOtp);

        mvc.perform(get("/api/citizen/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value(PHONE))
                .andExpect(jsonPath("$.subject.code").value("DTH-H000001"));
        accounts.flush();
        assertThat(jdbc.queryForObject("select last_login_at is not null from citizen_accounts where phone = ?",
                Boolean.class, PHONE)).isTrue();
    }

    @Test
    void verifyAcceptsInternationalAndSpacedPhoneFormats() throws Exception {
        mvc.perform(verify("+84 902 000 001", demoOtp))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.account.phone").value(PHONE))
                .andExpect(jsonPath("$.account.subjectCode").value("DTH-H000001"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    void wrongOtpOrUnknownPhoneReturns401WithSameVietnameseMessage() throws Exception {
        String wrongOtp = demoOtp.equals("000000") ? "111111" : "000000";
        String m1 = mvc.perform(verify(PHONE, wrongOtp))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_OTP"))
                .andReturn().getResponse().getContentAsString();
        String m2 = mvc.perform(verify("0999999999", demoOtp))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_OTP"))
                .andReturn().getResponse().getContentAsString();
        assertThat(m1).isEqualTo(m2).contains("OTP");
    }

    @Test
    void lockedAccountCannotLogIn() throws Exception {
        accounts.findByPhone(PHONE).orElseThrow().lock();
        accounts.flush();

        mvc.perform(verify(PHONE, demoOtp))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    void citizenTokenIsRejectedByInternalApis() throws Exception {
        String bearer = "Bearer " + login(PHONE, demoOtp);

        mvc.perform(get("/api/platform/auth/me").header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(get("/api/billing/charges").header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/masterdata/areas").header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isForbidden());
    }

    @Test
    void internalTokenIsRejectedByCitizenApis() throws Exception {
        mvc.perform(get("/api/citizen/me").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/citizen/charges").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(status().isForbidden());
    }

    @Test
    void citizenApisRequireLogin() throws Exception {
        mvc.perform(get("/api/citizen/me")).andExpect(status().isUnauthorized());
    }

    private String login(String phone, String otp) throws Exception {
        String body = mvc.perform(verify(phone, otp)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = json.readTree(body);
        return node.get("accessToken").asText();
    }

    private org.springframework.test.web.servlet.RequestBuilder verify(String phone, String otp) {
        return post("/api/citizen/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"" + phone + "\",\"otp\":\"" + otp + "\"}");
    }
}
