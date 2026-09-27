package vn.dongthanh.vsmt.citizen;

import static java.util.Collections.nCopies;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Stream;

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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * T47: chợ đồ cũ và ảnh người dân. Hộ A = DTH-H000001 (KV07), hộ B = DTH-H000005 (KV12).
 * Không bọc {@code @Transactional}: dữ liệu commit thật như app gọi, để lộ lỗi đọc proxy lười khi controller dựng DTO
 * sau khi transaction của service đóng (server thật {@code open-in-view: false} trả 500).
 */
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class MarketIT extends IntegrationTest {

    static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'};
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'};
    static final byte[] WEBP = {'R', 'I', 'F', 'F', 0x24, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '};
    static final int FIVE_MB = 5 * 1024 * 1024;

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper json;
    @Autowired DatabaseCleaner cleaner;
    @Autowired TransactionTemplate tx;
    @Value("${vsmt.upload-dir}") String uploadDir;

    CitizenAccount citizenA;
    CitizenAccount citizenB;

    @BeforeEach
    void setUp() {
        cleaner.truncateAll();
        tx.executeWithoutResult(s -> {
            fx.build();
            citizenA = accounts.save(CitizenAccount.create("0902000001",
                    subjects.findByCode("DTH-H000001").orElseThrow(), "Chủ hộ A"));
            citizenB = accounts.save(CitizenAccount.create("0902000005",
                    subjects.findByCode("DTH-H000005").orElseThrow(), "Chủ hộ B"));
        });
    }

    /** Xóa dữ liệu đã commit và ảnh đã tải (thư mục tạm của test) để không dồn sang test/lần chạy sau. */
    @AfterEach
    void clean() throws Exception {
        cleaner.truncateAll();
        try (Stream<Path> files = Files.list(Path.of(uploadDir))) {
            for (Path f : files.toList()) {
                Files.deleteIfExists(f);
            }
        }
    }

    @Test
    void citizenPostsAndOthersSeeItInListFilteredByTypeAndInDetail() throws Exception {
        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"title": " Ghế sofa 3 chỗ ", "postType": "GIVE", "description": "Còn chắc, bạc màu nhẹ",
                 "pickupLocation": "Hẻm 12, Tổ 07"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("CDC-001"))
                .andExpect(jsonPath("$.title").value("Ghế sofa 3 chỗ"))
                .andExpect(jsonPath("$.postType").value("GIVE"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.pickupLocation").value("Hẻm 12, Tổ 07"))
                .andExpect(jsonPath("$.photoUrls").isEmpty())
                .andExpect(jsonPath("$.author.displayName").value("Chủ hộ A"))
                .andExpect(jsonPath("$.author.areaCode").value("KV07"))
                .andExpect(jsonPath("$.author.areaName").value("Tổ 07"))
                .andExpect(jsonPath("$.mine").value(true))
                .andExpect(jsonPath("$.commentCount").value(0))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
        long exchangeId = create(citizenB, "Tủ quần áo gỗ ép", "EXCHANGE");

        citizen(citizenB, get("/api/citizen/market/posts"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[*].code").value(contains("CDC-002", "CDC-001")))
                .andExpect(jsonPath("$.items[*].mine").value(contains(true, false)))
                .andExpect(jsonPath("$.items[1].author.areaCode").value("KV07"));
        citizen(citizenB, get("/api/citizen/market/posts").param("type", "GIVE"), null)
                .andExpect(jsonPath("$.items[*].code").value(contains("CDC-001")));
        citizen(citizenA, get("/api/citizen/market/posts").param("type", "EXCHANGE"), null)
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[*].code").value(contains("CDC-002")));

        citizen(citizenA, get("/api/citizen/market/posts/{id}", exchangeId), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.post.code").value("CDC-002"))
                .andExpect(jsonPath("$.post.author.displayName").value("Chủ hộ B"))
                .andExpect(jsonPath("$.post.author.areaCode").value("KV12"))
                .andExpect(jsonPath("$.post.pickupLocation").isEmpty())
                .andExpect(jsonPath("$.post.mine").value(false))
                .andExpect(jsonPath("$.comments").isEmpty());
        citizen(citizenA, get("/api/citizen/market/posts/{id}", 999_999), null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MARKET_POST_NOT_FOUND"));
    }

    @Test
    void commentsShowOldestFirstInDetailAndCountInList() throws Exception {
        long id = create(citizenA, "Bàn ăn 4 ghế", "GIVE");

        citizen(citizenB, post("/api/citizen/market/posts/{id}/comments", id), "{\"content\": \" Còn không chị? \"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Còn không chị?"))
                .andExpect(jsonPath("$.author.displayName").value("Chủ hộ B"))
                .andExpect(jsonPath("$.author.areaName").value("Tổ 12"))
                .andExpect(jsonPath("$.mine").value(true));
        citizen(citizenA, post("/api/citizen/market/posts/{id}/comments", id), "{\"content\": \"Còn em nhé\"}")
                .andExpect(status().isCreated());

        citizen(citizenA, get("/api/citizen/market/posts/{id}", id), null)
                .andExpect(jsonPath("$.post.commentCount").value(2))
                .andExpect(jsonPath("$.comments[*].content").value(contains("Còn không chị?", "Còn em nhé")))
                .andExpect(jsonPath("$.comments[*].mine").value(contains(false, true)));
        citizen(citizenB, get("/api/citizen/market/posts"), null)
                .andExpect(jsonPath("$.items[0].commentCount").value(2));

        citizen(citizenB, post("/api/citizen/market/posts/{id}/comments", id), "{\"content\": \"  \"}")
                .andExpect(status().isBadRequest());
        citizen(citizenB, post("/api/citizen/market/posts/{id}/comments", 999_999), "{\"content\": \"x\"}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MARKET_POST_NOT_FOUND"));
    }

    @Test
    void onlyAuthorClosesPostOnceWithoutReopeningAndClosedPostsLeaveDefaultList() throws Exception {
        long id = create(citizenA, "Xe đạp trẻ em", "GIVE");

        citizen(citizenB, post("/api/citizen/market/posts/{id}/status", id), "{\"status\": \"CLOSED\"}")
                .andExpect(status().isForbidden());
        citizen(citizenB, get("/api/citizen/market/posts/{id}", id), null)
                .andExpect(jsonPath("$.post.status").value("OPEN"));

        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), "{}")
                .andExpect(status().isBadRequest());
        // Quyết định 27/09/2026: endpoint chỉ nhận CLOSED.
        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), "{\"status\": \"OPEN\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MARKET_POST_STATUS_INVALID"))
                .andExpect(jsonPath("$.message").value("Chỉ đóng được bài đăng; bài đã đóng không mở lại được."));
        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), "{\"status\": \"CLOSED\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.mine").value(true));

        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), "{\"status\": \"OPEN\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MARKET_POST_STATUS_INVALID"));
        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), "{\"status\": \"CLOSED\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MARKET_POST_CLOSED"))
                .andExpect(jsonPath("$.message").value("Bài CDC-001 đã đóng, không đóng lại được."));

        citizen(citizenB, get("/api/citizen/market/posts"), null)
                .andExpect(jsonPath("$.total").value(0));
        citizen(citizenB, get("/api/citizen/market/posts").param("status", "CLOSED"), null)
                .andExpect(jsonPath("$.items[*].id").value(contains((int) id)))
                .andExpect(jsonPath("$.items[0].status").value("CLOSED"));
    }

    @Test
    void closedPostTakesNoNewComments() throws Exception {
        long id = create(citizenA, "Nồi cơm điện", "GIVE");
        citizen(citizenB, post("/api/citizen/market/posts/{id}/comments", id), "{\"content\": \"Còn không chị?\"}")
                .andExpect(status().isCreated());
        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), "{\"status\": \"CLOSED\"}")
                .andExpect(status().isOk());

        citizen(citizenB, post("/api/citizen/market/posts/{id}/comments", id), "{\"content\": \"Cho em xin nhé\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MARKET_POST_CLOSED"))
                .andExpect(jsonPath("$.message").value("Bài CDC-001 đã đóng, không bình luận được."));
        citizen(citizenA, post("/api/citizen/market/posts/{id}/comments", id), "{\"content\": \"Đã cho rồi\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MARKET_POST_CLOSED"));

        // Bình luận cũ vẫn xem được.
        citizen(citizenB, get("/api/citizen/market/posts/{id}", id), null)
                .andExpect(jsonPath("$.post.commentCount").value(1))
                .andExpect(jsonPath("$.comments[*].content").value(contains("Còn không chị?")));
    }

    @Test
    void createValidatesRequiredFieldsAndType() throws Exception {
        citizen(citizenA, post("/api/citizen/market/posts"), "{\"postType\": \"GIVE\", \"description\": \"x\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        citizen(citizenA, post("/api/citizen/market/posts"), "{\"title\": \"x\", \"description\": \"x\"}")
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/market/posts"), "{\"title\": \"x\", \"postType\": \"SELL\", \"description\": \"x\"}")
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/market/posts"), "{\"title\": \"x\", \"postType\": \"GIVE\"}")
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/market/posts"),
                "{\"title\": \"" + "a".repeat(151) + "\", \"postType\": \"GIVE\", \"description\": \"x\"}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void internalTokenAndAnonymousAreRejected() throws Exception {
        long id = create(citizenA, "Ghế nhựa", "GIVE");
        String photo = upload(citizenA, JPEG);

        mvc.perform(get("/api/citizen/market/posts").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/citizen/market/posts/{id}/comments", id)
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager))
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\": \"x\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(multipart("/api/citizen/photos").file(jpegFile(JPEG))
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/citizen/photos/{name}", photo).header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.admin)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/citizen/photos/{name}", photo)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/citizen/market/posts")).andExpect(status().isUnauthorized());
    }

    @Test
    void uploadsJpegPngWebpAndAnyCitizenCanViewThem() throws Exception {
        assertUploadedAndServed(JPEG, "jpg", "image/jpeg");
        assertUploadedAndServed(PNG, "png", "image/png");
        assertUploadedAndServed(WEBP, "webp", "image/webp");
    }

    @Test
    void uploadRejectsWrongTypeOversizeAndMissingFile() throws Exception {
        citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile("xin chào".getBytes())), null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PHOTO_TYPE_INVALID"));
        citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile("GIF89a......".getBytes())), null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PHOTO_TYPE_INVALID"));
        citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile(new byte[0])), null)
                .andExpect(status().isUnprocessableEntity());
        citizen(citizenA, multipart("/api/citizen/photos"), null)
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/photos"), "{}")
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Cùng mã với giới hạn multipart của Tomcat trên server thật (GlobalExceptionHandlerTest).
        upload(citizenA, jpegOfSize(FIVE_MB));
        citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile(jpegOfSize(FIVE_MB + 1))), null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
    }

    @Test
    void photoNamesAreValidatedAndFilesOutsideUploadDirCannotBeRead() throws Exception {
        citizen(citizenA, get("/api/citizen/photos/{name}", "evil.txt"), null)
                .andExpect(status().isBadRequest());
        citizen(citizenA, get("/api/citizen/photos/{name}", "anh-cua-toi.jpg"), null)
                .andExpect(status().isBadRequest());
        citizen(citizenA, get("/api/citizen/photos/{name}", UUID.randomUUID() + ".jpg"), null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));

        String name = UUID.randomUUID() + ".jpg";
        Path outside = Path.of(uploadDir).toAbsolutePath().normalize().getParent().resolve(name);
        Files.write(outside, JPEG);
        try {
            citizen(citizenA, get("/api/citizen/photos/../" + name), null)
                    .andExpect(status().is4xxClientError());
            citizen(citizenA, get(URI.create("/api/citizen/photos/..%2F" + name)), null)
                    .andExpect(status().is4xxClientError());
            citizen(citizenA, get(URI.create("/api/citizen/photos/..%5C" + name)), null)
                    .andExpect(status().is4xxClientError());
        } finally {
            Files.deleteIfExists(outside);
        }
    }

    @Test
    void postAttachesOnlyStoredPhotoNamesNotUrls() throws Exception {
        String photo = upload(citizenA, PNG);

        // Tối đa 5 tên (MAX_PHOTOS); tên trùng chỉ lưu một lần.
        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"title": "Kệ sách", "postType": "EXCHANGE", "description": "Kệ 3 tầng",
                 "photoNames": %s}""".formatted(json.writeValueAsString(nCopies(5, photo))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.photoUrls").value(contains("/api/citizen/photos/" + photo)));

        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"title": "Kệ sách", "postType": "EXCHANGE", "description": "x",
                 "photoNames": ["https://example.com/a.jpg"]}""")
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"title": "Kệ sách", "postType": "EXCHANGE", "description": "x",
                 "photoNames": ["../%s"]}""".formatted(photo))
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"title": "Kệ sách", "postType": "EXCHANGE", "description": "x",
                 "photoNames": ["%s.jpg"]}""".formatted(UUID.randomUUID()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));
        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"title": "Kệ sách", "postType": "EXCHANGE", "description": "x", "photoNames": [null]}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"title": "Kệ sách", "postType": "EXCHANGE", "description": "x",
                 "photoNames": %s}""".formatted(json.writeValueAsString(nCopies(6, photo))))
                .andExpect(status().isBadRequest());
    }

    private void assertUploadedAndServed(byte[] bytes, String ext, String contentType) throws Exception {
        String body = citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile(bytes)), null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(matchesPattern("^[0-9a-f-]{36}\\." + ext + "$")))
                .andReturn().getResponse().getContentAsString();
        String name = json.readTree(body).get("name").asText();
        assertThat(json.readTree(body).get("url").asText()).isEqualTo("/api/citizen/photos/" + name);

        citizen(citizenB, get("/api/citizen/photos/{name}", name), null)
                .andExpect(status().isOk())
                .andExpect(content().contentType(contentType))
                .andExpect(content().bytes(bytes));
    }

    private long create(CitizenAccount citizen, String title, String type) throws Exception {
        String body = citizen(citizen, post("/api/citizen/market/posts"),
                "{\"title\": \"%s\", \"postType\": \"%s\", \"description\": \"Mô tả\"}".formatted(title, type))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private String upload(CitizenAccount citizen, byte[] bytes) throws Exception {
        String body = citizen(citizen, multipart("/api/citizen/photos").file(jpegFile(bytes)), null)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("name").asText();
    }

    /** Tên và Content-Type phía client luôn là JPEG: server nhận dạng theo nội dung file. */
    private static MockMultipartFile jpegFile(byte[] bytes) {
        return new MockMultipartFile("file", "anh.jpg", MediaType.IMAGE_JPEG_VALUE, bytes);
    }

    private static byte[] jpegOfSize(int size) {
        return Arrays.copyOf(JPEG, size);
    }

    private ResultActions citizen(CitizenAccount a, MockHttpServletRequestBuilder req, String body) throws Exception {
        req.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.issueCitizen(a.getId(), a.getSubject().getId()).value());
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }
}
