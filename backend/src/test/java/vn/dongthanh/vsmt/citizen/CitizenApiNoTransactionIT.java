package vn.dongthanh.vsmt.citizen;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketComment;
import vn.dongthanh.vsmt.citizen.domain.MarketCommentRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketPost;
import vn.dongthanh.vsmt.citizen.domain.MarketPostRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketTag;
import vn.dongthanh.vsmt.citizen.domain.MarketCategory;
import vn.dongthanh.vsmt.collection.service.CollectionService;
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
    @Autowired CollectionService collection;
    @Autowired MarketPostRepository marketPosts;
    @Autowired MarketCommentRepository marketComments;
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
    void vietQrConfirmationLoadsOutsideTestTransaction() throws Exception {
        long paymentId = collection.recordBankTransfer(chargeId, 80_000, "FT26100001", "sepay-nt-1").getId();

        ok(get("/api/citizen/payments")).andExpect(jsonPath("$[0].periodLabel").isNotEmpty());
        ok(get("/api/citizen/payments/" + paymentId + "/confirmation")).andExpect(jsonPath("$.companyName").isNotEmpty());
        ok(get("/api/citizen/notifications")).andExpect(jsonPath("$.items[0].title").value("Đã ghi nhận thu phí 2026-10"));
    }

    @Test
    void complaintFlowLoadsOutsideTestTransaction() throws Exception {
        long complaintId = body(ok(post("/api/citizen/complaints"),
                "{\"category\":\"LATE_COLLECTION\",\"content\":\"Xe thu gom đến trễ\"}")).get("complaint").get("id").asLong();
        ok(get("/api/citizen/complaints")).andExpect(jsonPath("$[0].areaCode").value("KV07"));
        ok(get("/api/citizen/complaints/" + complaintId)).andExpect(jsonPath("$.events[0].eventType").value("SUBMITTED"));
    }

    @Test
    void marketFlowLoadsOutsideTestTransaction() throws Exception {
        // Bài và bình luận của hộ B: người đăng khác người đang xem nên không có sẵn trong session của request.
        long otherPostId = tx.execute(s -> {
            CitizenAccount b = accounts.save(CitizenAccount.create("0902000005",
                    subjects.findByCode("DTH-H000005").orElseThrow(), "Chủ hộ B"));
            MarketPost p = marketPosts.save(MarketPost.create("CDC-001", b, new MarketPost.Content("Tủ gỗ\n\nCòn tốt",
                    Set.of(MarketTag.EXCHANGE), MarketCategory.FURNITURE, null), null, null));
            marketComments.save(MarketComment.create(p, b, "Ưu tiên đổi bàn học", null, null));
            return p.getId();
        });
        long imageId = body(mvc.perform(multipart("/api/citizen/market/images").file(new MockMultipartFile("file",
                        "anh.jpg", MediaType.IMAGE_JPEG_VALUE, MarketIT.JPEG)).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isCreated())).get("id").asLong();
        long withPhoto = body(ok(post("/api/citizen/market/posts"), """
                {"caption":"Kệ sách","tags":["GIVE"],"photoIds":[%d],"clientRequestId":"%s"}"""
                .formatted(imageId, UUID.randomUUID()))).get("id").asLong();
        ok(get("/api/market/posts/" + withPhoto + "/images/" + imageId));
        long myPostId = body(ok(post("/api/citizen/market/posts"),
                "{\"caption\":\"Ghế nhựa\",\"tags\":[\"GIVE\",\"SELL\"],\"clientRequestId\":\"%s\"}"
                        .formatted(UUID.randomUUID()))
                .andExpect(jsonPath("$.area.code").value("KV07"))).get("id").asLong();
        ok(get("/api/market/posts"))
                .andExpect(jsonPath("$.items[*].area.code").value(contains("KV07", "KV07", "KV12")));
        ok(post("/api/citizen/market/posts/" + otherPostId + "/comments"),
                "{\"content\":\"Còn không anh?\",\"clientRequestId\":\"%s\"}".formatted(UUID.randomUUID()))
                .andExpect(jsonPath("$.author.displayName").value("Chủ hộ A"));
        ok(get("/api/market/posts/" + otherPostId)).andExpect(jsonPath("$.area.code").value("KV12"));
        ok(get("/api/market/posts/" + otherPostId + "/comments"))
                .andExpect(jsonPath("$.items[*].author.displayName").value(contains("Chủ hộ B", "Chủ hộ A")));
        ok(post("/api/citizen/market/posts/" + myPostId + "/status"), "{\"status\":\"CLOSED\",\"version\":0}")
                .andExpect(jsonPath("$.status").value("CLOSED"));
        ok(get("/api/citizen/market/posts/mine")).andExpect(jsonPath("$.total").value(2));
    }

    @Test
    void concurrentMarketPostsGetDistinctCodes() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<Integer>> results = new ArrayList<>();
            for (int i = 0; i < 4; i++) {
                String body = "{\"caption\":\"Ghế nhựa\",\"tags\":[\"GIVE\"],\"clientRequestId\":\"%s\"}"
                        .formatted(UUID.randomUUID());
                results.add(pool.submit(() -> {
                    start.await();
                    return mvc.perform(post("/api/citizen/market/posts").header(HttpHeaders.AUTHORIZATION, token)
                                    .contentType(MediaType.APPLICATION_JSON).content(body))
                            .andReturn().getResponse().getStatus();
                }));
            }
            start.countDown();
            for (Future<Integer> r : results) {
                assertThat(r.get(30, TimeUnit.SECONDS)).isEqualTo(201);
            }
        } finally {
            pool.shutdownNow();
        }
        ok(get("/api/market/posts")).andExpect(jsonPath("$.items[*].code",
                containsInAnyOrder("CDC-001", "CDC-002", "CDC-003", "CDC-004")));
    }

    private org.springframework.test.web.servlet.ResultActions ok(MockHttpServletRequestBuilder req) throws Exception {
        return mvc.perform(req.header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().is2xxSuccessful());
    }

    private org.springframework.test.web.servlet.ResultActions ok(MockHttpServletRequestBuilder req, String content)
            throws Exception {
        return ok(req.contentType(MediaType.APPLICATION_JSON).content(content));
    }

    private JsonNode body(org.springframework.test.web.servlet.ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
