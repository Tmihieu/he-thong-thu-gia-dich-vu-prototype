package vn.dongthanh.vsmt.citizen;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * Gọi mọi API người dân như app thật: dữ liệu đã commit, không có transaction của test bao ngoài.
 * Các IT khác của package chạy trong {@code @Transactional} nên session Hibernate mở suốt request và che lỗi
 * đọc proxy lười khi controller dựng DTO (server thật {@code open-in-view: false} trả 500).
 */
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class CitizenApiNoTransactionIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired TransactionTemplate tx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired ObjectMapper json;

    @Value("${vsmt.citizen.demo-otp}")
    String demoOtp;

    long chargeId;
    String token;

    @BeforeEach
    void seed() throws Exception {
        cleaner.truncateAll();
        tx.executeWithoutResult(s -> {
            fx.build();
            accounts.save(CitizenAccount.create("0902000001", subjects.findByCode("DTH-H000001").orElseThrow(),
                    "Chủ hộ A"));
        });
        chargeId = fx.chargeId("DTH-H000001");
        token = "Bearer " + body(mvc.perform(post("/api/citizen/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"0902000001\",\"otp\":\"" + demoOtp + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.account.subjectCode").value("DTH-H000001"))).get("accessToken").asText();
    }

    @AfterEach
    void clean() {
        cleaner.truncateAll();
    }

    @Test
    void householdProfileScheduleAndChargesLoadOutsideTestTransaction() throws Exception {
        ok(get("/api/citizen/me")).andExpect(jsonPath("$.subject.districtName").isNotEmpty());
        ok(get("/api/citizen/schedule")).andExpect(jsonPath("$.areaCode").value("KV07"));
        ok(get("/api/citizen/charges")).andExpect(jsonPath("$[0].periodCode").value("2026-10"));
        ok(get("/api/citizen/charges/" + chargeId)).andExpect(jsonPath("$.feeTypeCode").isNotEmpty());
    }

    @Test
    void payTwiceWithSameRequestIdReturnsConfirmationBothTimes() throws Exception {
        String pay = "{\"chargeId\":%d,\"amount\":80000,\"clientRequestId\":\"nt-1\"}".formatted(chargeId);
        ok(post("/api/citizen/payments"), pay).andExpect(jsonPath("$.replayed").value(false));
        JsonNode replay = body(ok(post("/api/citizen/payments"), pay)
                .andExpect(jsonPath("$.replayed").value(true))
                .andExpect(jsonPath("$.confirmation.chargeCode").isNotEmpty()));
        long paymentId = replay.get("confirmation").get("id").asLong();

        ok(get("/api/citizen/payments")).andExpect(jsonPath("$[0].periodLabel").isNotEmpty());
        ok(get("/api/citizen/payments/" + paymentId + "/confirmation")).andExpect(jsonPath("$.companyName").isNotEmpty());
        ok(get("/api/citizen/notifications")).andExpect(jsonPath("$.items[0].title").value("Thanh toán thành công"));
    }

    @Test
    void complaintAndBulkyRequestFlowsLoadOutsideTestTransaction() throws Exception {
        long complaintId = body(ok(post("/api/citizen/complaints"),
                "{\"category\":\"LATE_COLLECTION\",\"content\":\"Xe thu gom đến trễ\"}")).get("complaint").get("id").asLong();
        ok(get("/api/citizen/complaints")).andExpect(jsonPath("$[0].areaCode").value("KV07"));
        ok(get("/api/citizen/complaints/" + complaintId)).andExpect(jsonPath("$.events[0].eventType").value("SUBMITTED"));

        long bulkyId = body(ok(post("/api/citizen/bulky-requests"),
                "{\"itemType\":\"MATTRESS\",\"quantity\":1,\"preferredDate\":\"2026-10-18\"}")).get("id").asLong();
        ok(get("/api/citizen/bulky-requests")).andExpect(jsonPath("$[0].companyName").isNotEmpty());
        ok(get("/api/citizen/bulky-requests/" + bulkyId)).andExpect(jsonPath("$.areaCode").value("KV07"));

        // Màn công ty (T45) cũng dựng DTO ngoài transaction.
        String dv01 = fx.bearer(fx.dv01Manager);
        long quotedId = body(ok(post("/api/citizen/bulky-requests"),
                "{\"itemType\":\"FURNITURE\",\"quantity\":2,\"preferredDate\":\"2026-10-18\"}")).get("id").asLong();
        company(dv01, get("/api/bulky-requests")).andExpect(jsonPath("$[0].subjectCode").value("DTH-H000001"));
        company(dv01, post("/api/bulky-requests/" + quotedId + "/quote").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fee\":150000}")).andExpect(jsonPath("$.status").value("QUOTED"));
        company(dv01, post("/api/bulky-requests/" + quotedId + "/collected")).andExpect(jsonPath("$.status").value("COLLECTED"));
        ok(post("/api/citizen/bulky-requests/" + bulkyId + "/cancel"), "{\"reason\":\"Đã tự xử lý\"}")
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    private org.springframework.test.web.servlet.ResultActions ok(MockHttpServletRequestBuilder req) throws Exception {
        return mvc.perform(req.header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().is2xxSuccessful());
    }

    private org.springframework.test.web.servlet.ResultActions ok(MockHttpServletRequestBuilder req, String content)
            throws Exception {
        return ok(req.contentType(MediaType.APPLICATION_JSON).content(content));
    }

    private org.springframework.test.web.servlet.ResultActions company(String bearer, MockHttpServletRequestBuilder req)
            throws Exception {
        return mvc.perform(req.header(HttpHeaders.AUTHORIZATION, bearer)).andExpect(status().isOk());
    }

    private JsonNode body(org.springframework.test.web.servlet.ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
